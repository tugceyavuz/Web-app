"use client";

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import {signIn, signOut, useSession, getProviders} from 'next-auth/react'

const Nav = () => {
  const isUserLoggedIn = true;
  const [providers, setProviders] = useState(null);

  const [toggleDropdown, settoggleDropdown] = useState(false)

  useEffect(() => {
    const setProviders = async () => {
      const response = await getProviders();
      setProviders(response);
    }

    setProviders();
  }, [])


  return (
    <nav className="felx-between w-full mb-16 pt-3">
      <Link href="/" className="flex gap-2 flex-center">
        <Image 
          src="/assets/images/logo.svg"
          alt="Promptopia logo"
          width={30}
          height={30}
          className="object-contain"
        />
        <p className="logo_text">Promotopia</p>
      </Link>

      <div className="sm:flex hidden justify-end items-center">
        {isUserLoggedIn? (
          <div className="flex gap-3 md:gap-5"> 
            <Link href="/create-prompt"
            className="black_btn">
              Create Post
            </Link>

            <button type="button" onClick={signOut}
            className="outline_btn">
                Sign Out
            </button>

            <Link href="/profile">
              <Image src="/assets/images/logo.svg"
              width={37}
              height={37}
              className="rounded-full"
              alt="profile"
              onClick={() => {}}>
              </Image>
            </Link>
            
          </div>
          ) : (
          <>
          {providers && 
            Object.values(providers).map((provider) => (
                <button 
                  type="button"
                  key={provider.name}
                  onClick={() => signIn(provider.id)}
                  className="black_btn"           
                >
                   Sign In
                </button>
             ))}   
          </>
        )}
      </div>
      {/* Mobile Nav  */}
      <div className="sm:hidden justify-end flex relative">
        {isUserLoggedIn? (
          <div className="flex">
              <Image src="/assets/images/logo.svg"
              width={37}
              height={37}
              className="rounded-full"
              alt="profile"
              onClick={() => settoggleDropdown ((prev) => (!prev))}>
              </Image>

              {toggleDropdown && (
              <div className="absolute top-10 right-0 bg-white rounded-md shadow-md w-48 py-2">
                <Link href="/profile"
                className="dropdown_link"
                onClick={() => settoggleDropdown(false)}>
                  My Profile
                </Link>
                <Link href="/create-prompt"
                className="dropdown_link"
                onClick={() => settoggleDropdown(false)}>
                  Create Promt
                </Link>
                <button type="button"
                onClick={() => {settoggleDropdown(false); signOut();}}
                className="mt-5 w-full black_btn">
                  Sign Out
                </button>
              </div>
            )}

          </div>
        ):(
          <>
          {providers && 
            Object.values(providers).map((provider) => (
                <button 
                  type="button"
                  key={provider.name}
                  onClick={() => signIn(provider.id)}
                  className="black_btn"           
                >
                   Sign In
                </button>
             ))}   
          </>
        )}
      </div>

    </nav>
  )
}

export default Nav