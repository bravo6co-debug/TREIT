import { serve } from "https://deno.land/std/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js'
import { validateUser, requireAdvertiser } from '../_shared/auth.ts'
import { handleCors } from '../_shared/cors.ts'
import { createResponse } from '../_shared/utils.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Validate authentication and require advertiser privileges
    const authHeader = req.headers.get('authorization')
    const { user } = await requireAdvertiser(authHeader)

    const { 
      business_id,
      amount, 
      currency = 'KRW',
      payment_method = 'card',
      provider = 'stripe',
      provider_payment_id,
      description,
      webhook_signature
    } = await req.json()

    if (!business_id || !amount || amount <= 0) {
      return createResponse(null, {
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'Business ID and valid amount are required'
      }, 400)
    }

    // Validate minimum charge amount (e.g., 10,000 KRW)
    const minAmount = currency === 'KRW' ? 10000 : 10
    if (amount < minAmount) {
      return createResponse(null, {
        code: 'AMOUNT_TOO_LOW',
        message: `Minimum charge amount is ${minAmount} ${currency}`
      }, 400)
    }

    // Validate maximum charge amount (e.g., 10,000,000 KRW)
    const maxAmount = currency === 'KRW' ? 10000000 : 10000
    if (amount > maxAmount) {
      return createResponse(null, {
        code: 'AMOUNT_TOO_HIGH',
        message: `Maximum charge amount is ${maxAmount} ${currency}`
      }, 400)
    }

    // Verify business exists and user has access
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select(`
        id,
        company_name,
        status,
        auth_uid,
        credit_balance,
        total_spent
      `)
      .eq('id', business_id)
      .single()

    if (businessError || !business) {
      return createResponse(null, {
        code: 'BUSINESS_NOT_FOUND',
        message: 'Business not found'
      }, 404)
    }

    // Verify user has access to this business
    if (business.auth_uid !== user.id) {
      const { data: userData } = await supabase
        .from('users')
        .select('user_type')
        .eq('id', user.id)
        .single()

      if (userData?.user_type !== 'admin') {
        return createResponse(null, {
          code: 'PERMISSION_DENIED',
          message: 'You do not have permission to charge this business account'
        }, 403)
      }
    }

    // Check business verification status
    if (business.status !== 'verified') {
      return createResponse(null, {
        code: 'BUSINESS_NOT_VERIFIED',
        message: 'Business must be verified before making payments'
      }, 400)
    }

    let transactionStatus = 'pending'
    let referenceId = null
    let providerResponse = null

    try {
      // Webhook validation for Stripe
      if (webhook_signature && provider === 'stripe') {
        const stripeSignature = req.headers.get('stripe-signature')
        if (stripeSignature !== webhook_signature) {
          return createResponse(null, {
            code: 'INVALID_WEBHOOK_SIGNATURE',
            message: 'Invalid webhook signature'
          }, 401)
        }
      }

      // Process payment based on provider
      if (provider_payment_id) {
        // Payment already processed by provider, just record it
        referenceId = provider_payment_id
        transactionStatus = 'completed'
        
        // In production, verify the payment with the provider
        // const verification = await verifyPaymentWithProvider(provider, provider_payment_id)
        // transactionStatus = verification.status
        
      } else {
        // Create new payment intent (this would be done on frontend usually)
        if (provider === 'stripe') {
          // const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'))
          // const paymentIntent = await stripe.paymentIntents.create({
          //   amount: Math.round(amount), // Stripe expects amounts in smallest currency unit
          //   currency: currency.toLowerCase(),
          //   payment_method: payment_method_id,
          //   confirm: true,
          //   metadata: {
          //     business_id: business_id,
          //     user_id: user.id
          //   }
          // })
          // referenceId = paymentIntent.id
          // transactionStatus = paymentIntent.status === 'succeeded' ? 'completed' : 'pending'
          
          // For demo purposes, simulate successful payment
          referenceId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          transactionStatus = 'completed'
        }
      }

    } catch (paymentError) {
      console.error('Payment processing error:', paymentError)
      referenceId = `failed_${Date.now()}`
      transactionStatus = 'failed'
    }

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        business_id: business_id,
        user_id: user.id,
        type: 'credit_charge',
        amount: amount,
        currency: currency,
        payment_method: payment_method,
        provider: provider,
        provider_transaction_id: referenceId,
        status: transactionStatus,
        description: description || `Credit charge for ${business.company_name}`,
        metadata: {
          original_amount: amount,
          currency: currency,
          provider_response: providerResponse
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (transactionError) {
      throw transactionError
    }

    // Update business credit balance for completed transactions
    let newCreditBalance = business.credit_balance
    if (transactionStatus === 'completed') {
      newCreditBalance = (Number(business.credit_balance) || 0) + Number(amount)
      
      const { error: balanceError } = await supabase
        .from('businesses')
        .update({
          credit_balance: newCreditBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', business_id)

      if (balanceError) {
        console.error('Credit balance update error:', balanceError)
        // Mark transaction as failed if we can't update balance
        await supabase
          .from('transactions')
          .update({ 
            status: 'failed',
            error_message: 'Failed to update credit balance'
          })
          .eq('id', transaction.id)
        
        return createResponse(null, {
          code: 'BALANCE_UPDATE_FAILED',
          message: 'Payment processed but failed to update credit balance'
        }, 500)
      }
    }

    // Send confirmation email/notification
    if (transactionStatus === 'completed') {
      // await sendPaymentConfirmationEmail(user.email, {
      //   amount: amount,
      //   currency: currency,
      //   business_name: business.company_name,
      //   transaction_id: transaction.id,
      //   new_balance: newCreditBalance
      // })
    }

    return createResponse({
      transaction_id: transaction.id,
      status: transactionStatus,
      credits_added: transactionStatus === 'completed' ? amount : 0,
      total_credits: newCreditBalance,
      provider_transaction_id: referenceId,
      currency: currency,
      business: {
        id: business.id,
        company_name: business.company_name
      }
    })

  } catch (error) {
    console.error('Error in process-payment function:', error)
    
    return createResponse(null, {
      code: 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred'
    }, 500)
  }
})