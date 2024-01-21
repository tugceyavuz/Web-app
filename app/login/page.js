'use client'
// Import necessary dependencies
import React, { useState } from 'react';
import signIn from 'app/api/auth/signIn';
import { useRouter } from 'next/navigation';

// Page component
function Page() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null); // New state for error handling
  const router = useRouter();

  const handleForm = async (event) => {
    event.preventDefault();

    // Reset error state
    setError(null);

    const { result, error: signInError } = await signIn(email, password);

    if (signInError) {
      // Set the error state with the error message
      setError('Username or password is incorrect.');
      console.error(signInError); 
      return;
    }

    // Successful login
    console.log(result);
    router.push('/admin-panel');
  };

  const goBack = () => {
    router.back();
  };

  return (
    <section className='h-screen w-screen'>
      <button className='bg-[#440807] bg-opacity-95 flex-center text-white rounded mx-5 p-1' onClick={goBack}>Go to Home</button>
      <div className="min-h-screen flex items-center justify-center bg-cover" style={{ backgroundImage: "public/assets/images/c_background.jpg" }}>
        <div className="bg-white p-8 rounded shadow-md">
          <h1 className="text-3xl font-bold mb-6">ADMIN PANEL</h1>
          <form onSubmit={handleForm} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-600">
                Email
              </label>
              <input
                onChange={(e) => setEmail(e.target.value)}
                required
                type="email"
                name="email"
                id="email"
                placeholder="example@mail.com"
                className="mt-1 p-2 w-full border rounded"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-600">
                Password
              </label>
              <input
                onChange={(e) => setPassword(e.target.value)}
                required
                type="password"
                name="password"
                id="password"
                placeholder="password"
                className="mt-1 p-2 w-full border rounded"
              />
            </div>
            <button
              type="submit"
              className="bg-[#440807] bg-opacity-95 text-white py-2 px-4 rounded hover:bg-red-950"
            >
              LOG IN
            </button>
          </form>

          {/* Error popup */}
          {error && (
            <div className="mt-4 text-red-500">
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default Page;
