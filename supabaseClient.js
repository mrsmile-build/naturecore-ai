const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://kwuutumzvdcsmbioqhbh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3dXV0dW16dmRjc21iaW9xaGJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NTAzOTEsImV4cCI6MjA5NTMyNjM5MX0.7_Eatvd75ez4kGv745Fd7bF6pyKMp1LYl-hNPvierbA';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
