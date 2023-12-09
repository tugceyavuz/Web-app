'use client'
import React from "react";
import signIn from "app/api/auth/signIn";
import { useRouter } from 'next/navigation'

function Page() {
    const [email, setEmail] = React.useState('')
    const [password, setPassword] = React.useState('')
    const router = useRouter()

    const handleForm = async (event) => {
        event.preventDefault()

        const { result, error } = await signIn(email, password);

        if (error) {
            return console.log(error)
        }

        // else successful
        console.log(result)
        return router.push("/create-prompt")
    }
    return (
        <div className="min-h-screen flex items-center justify-center bg-cover" style={{ backgroundImage: "public/assets/images/c_background.jpg" }}>
          <div className="bg-white p-8 rounded shadow-md">
            <h1 className="text-3xl font-bold mb-6">ADMİN GİRİŞİ</h1>
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
                GİRİŞ YAP
              </button>
            </form>
          </div>
        </div>
      );
}

export default Page;