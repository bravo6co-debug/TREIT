-- Storage setup for TreitMaster

-- Create storage buckets
insert into storage.buckets (id, name, public)
values 
  ('avatars', 'avatars', true),
  ('campaign-assets', 'campaign-assets', true),
  ('business-documents', 'business-documents', false);

-- Avatar storage policies
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars' 
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own avatar"
  on storage.objects for update
  with check (
    bucket_id = 'avatars' 
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars' 
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Campaign assets storage policies
create policy "Campaign assets are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'campaign-assets');

create policy "Advertisers can upload campaign assets"
  on storage.objects for insert
  with check (
    bucket_id = 'campaign-assets'
    and auth.uid() in (
      select a.user_id 
      from public.advertisers a
      join public.campaigns c on c.advertiser_id = a.id
      where c.id::text = (storage.foldername(name))[1]
    )
  );

create policy "Advertisers can update their campaign assets"
  on storage.objects for update
  with check (
    bucket_id = 'campaign-assets'
    and auth.uid() in (
      select a.user_id 
      from public.advertisers a
      join public.campaigns c on c.advertiser_id = a.id
      where c.id::text = (storage.foldername(name))[1]
    )
  );

create policy "Advertisers can delete their campaign assets"
  on storage.objects for delete
  using (
    bucket_id = 'campaign-assets'
    and auth.uid() in (
      select a.user_id 
      from public.advertisers a
      join public.campaigns c on c.advertiser_id = a.id
      where c.id::text = (storage.foldername(name))[1]
    )
  );

create policy "Admins can manage all campaign assets"
  on storage.objects for all
  using (
    bucket_id = 'campaign-assets'
    and exists (
      select 1 from public.users
      where id = auth.uid() and user_type = 'admin'
    )
  );

-- Business documents storage policies
create policy "Advertisers can upload their business documents"
  on storage.objects for insert
  with check (
    bucket_id = 'business-documents'
    and auth.uid() in (
      select user_id 
      from public.advertisers
      where id::text = (storage.foldername(name))[1]
    )
  );

create policy "Advertisers can view their business documents"
  on storage.objects for select
  using (
    bucket_id = 'business-documents'
    and auth.uid() in (
      select user_id 
      from public.advertisers
      where id::text = (storage.foldername(name))[1]
    )
  );

create policy "Advertisers can update their business documents"
  on storage.objects for update
  with check (
    bucket_id = 'business-documents'
    and auth.uid() in (
      select user_id 
      from public.advertisers
      where id::text = (storage.foldername(name))[1]
    )
  );

create policy "Advertisers can delete their business documents"
  on storage.objects for delete
  using (
    bucket_id = 'business-documents'
    and auth.uid() in (
      select user_id 
      from public.advertisers
      where id::text = (storage.foldername(name))[1]
    )
  );

create policy "Admins can manage all business documents"
  on storage.objects for all
  using (
    bucket_id = 'business-documents'
    and exists (
      select 1 from public.users
      where id = auth.uid() and user_type = 'admin'
    )
  );