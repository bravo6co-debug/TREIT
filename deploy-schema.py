#!/usr/bin/env python3

import psycopg2
import sys
from urllib.parse import urlparse

def read_schema_file(file_path):
    """Read and return the contents of the schema file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    except FileNotFoundError:
        print(f"Error: Schema file not found at {file_path}")
        sys.exit(1)
    except Exception as e:
        print(f"Error reading schema file: {e}")
        sys.exit(1)

def connect_to_supabase():
    """Connect to Supabase PostgreSQL database."""
    # Supabase connection parameters
    # For direct PostgreSQL connection, we need to use port 5432 and the database name
    host = "qbdctgumggdtfewttela.supabase.co"
    port = "5432"
    database = "postgres"  # Default database name for Supabase
    user = "postgres"      # Default user for Supabase
    
    # We'll try to connect without a password first, then prompt if needed
    connection_params = {
        'host': host,
        'port': port,
        'database': database,
        'user': user
    }
    
    try:
        print("Attempting to connect to Supabase PostgreSQL database...")
        print(f"Host: {host}")
        print(f"Port: {port}")
        print(f"Database: {database}")
        print(f"User: {user}")
        
        # For Supabase, we need the actual database password
        # Since we only have the anon key, let's try a different approach
        # We'll use the connection string format that Supabase provides
        
        # Alternative: Try connecting with the anon key as password (this might not work)
        connection_params['password'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZGN0Z3VtZ2dkdGZld3R0ZWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjIxMDEsImV4cCI6MjA3MjAzODEwMX0.WzbMhCyFDmibNhHjNBfpK70V8a1pF-ordZBLo63XKwE'
        
        connection = psycopg2.connect(**connection_params)
        print("✅ Successfully connected to the database!")
        return connection
        
    except psycopg2.OperationalError as e:
        print(f"❌ Failed to connect to database: {e}")
        print("\nNote: Direct PostgreSQL connection to Supabase requires:")
        print("1. The actual database password (not the API key)")
        print("2. Proper network access (some hosting providers block direct DB connections)")
        print("3. The service role key if using pooled connections")
        return None
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return None

def execute_schema(connection, schema_sql):
    """Execute the schema SQL against the database."""
    try:
        cursor = connection.cursor()
        
        print("Executing schema deployment...")
        print("Note: This may take a few minutes for complex schemas...")
        
        # Execute the entire schema as a single transaction
        cursor.execute(schema_sql)
        connection.commit()
        
        print("✅ Schema deployed successfully!")
        
        cursor.close()
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Database error during schema deployment: {e}")
        connection.rollback()
        return False
    except Exception as e:
        print(f"❌ Unexpected error during schema deployment: {e}")
        connection.rollback()
        return False

def verify_deployment(connection):
    """Verify the deployment by querying the level_config table."""
    try:
        cursor = connection.cursor()
        
        print("Verifying deployment...")
        
        # Check if level_config table exists and has data
        cursor.execute("SELECT COUNT(*) FROM level_config;")
        count = cursor.fetchone()[0]
        
        print(f"✅ level_config table contains {count} rows")
        
        # Get a sample of level configuration
        cursor.execute("SELECT level, grade, grade_title, level_title FROM level_config ORDER BY level LIMIT 5;")
        sample_data = cursor.fetchall()
        
        print("Sample level configuration:")
        for row in sample_data:
            level, grade, grade_title, level_title = row
            print(f"  Level {level}: {grade} - {grade_title} ({level_title})")
        
        cursor.close()
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Error during verification: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error during verification: {e}")
        return False

def main():
    """Main deployment function."""
    print("=== TreitMaster Database Schema Deployment ===")
    
    # Read the schema file
    schema_file_path = r'C:\dev-project\TreitMaster\database-schema-complete.sql'
    schema_sql = read_schema_file(schema_file_path)
    
    print(f"Schema file loaded: {len(schema_sql)} characters")
    
    # Connect to database
    connection = connect_to_supabase()
    if not connection:
        print("\n❌ Cannot proceed without database connection.")
        print("\nTo deploy to Supabase, you need:")
        print("1. The actual database password from your Supabase project settings")
        print("2. Or use the Supabase CLI: 'supabase db push'")
        print("3. Or copy-paste the schema into the Supabase SQL editor")
        sys.exit(1)
    
    try:
        # Execute schema
        if execute_schema(connection, schema_sql):
            # Verify deployment
            verify_deployment(connection)
            print("\n✅ Deployment completed successfully!")
        else:
            print("\n❌ Deployment failed!")
            sys.exit(1)
            
    finally:
        connection.close()
        print("Database connection closed.")

if __name__ == "__main__":
    main()