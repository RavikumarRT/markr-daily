-- Allow users to create their own department_heads profile during signup
CREATE POLICY "Users can insert their own profile during signup"
ON public.department_heads
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Also allow service role to insert (for migrations/admin operations)
CREATE POLICY "Service role can insert profiles"
ON public.department_heads
FOR INSERT
TO service_role
WITH CHECK (true);