'use client'  
import React from 'react';
import { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, getDocs, doc, getDoc,arrayUnion } from 'firebase/firestore';
import { set, ref, push, update, getDatabase, get, setDoc, onValue } from 'firebase/database';
import { db } from '/firebase/config';

function Meeting() {
  const [displayText, setDisplayText] = useState('');
  const [inputText, setInputText] = useState('');

  const handleInputChange = (e) => {
    setInputText(e.target.value);
  };

  

  const handleDisplayText = async (displayCount) => {
    try {
      // Retrieve the user ID from localStorage
      const storedUserId = localStorage.getItem('userId');
      const selectedProblem = localStorage.getItem('selectedProblem');
  
      if (!storedUserId || !selectedProblem) {
        console.error('User ID or selected problem not found in localStorage.');
        return;
      }
  
      const eventsCollection = collection(db, 'events');
      const eventsSnapshot = await getDocs(eventsCollection);
  
      eventsSnapshot.forEach((doc) => {
        const eventData = doc.data();
        const eventProblems = eventData.problems || [];
  
        // Find the chosen problem by name
        const chosenProblem = eventProblems.find((problem) => problem.name === selectedProblem);
        
        if (chosenProblem) {
          // Check if participants array exists
          const participantData = chosenProblem.partipicant.find((participant) => participant.id === storedUserId);
  
          if (participantData) {
            // Assuming 'pages' is an array inside 'partipicant'
            const pagesData = participantData.pages || [];
  
            console.log('displayCount', displayCount);
  
            // Display information about the user and pages up to the specified count
            const displayText = pagesData
                .slice(0, displayCount)
                .map((page, index) => (
                  <li key={index}>
                    <strong>Name:</strong> {page.name} <br />
                    <strong>Text:</strong> {page.textVal}
                  </li>
                ));

              // Update your state or UI as needed
              setDisplayText(<ul>{displayText}</ul>);
              setInputText('');
          } else {
            console.error('Participant not found in selected problem.');
          }
        } else {
          console.error('Selected problem not found in events collection.');
        }
      });
    } catch (error) {
      console.error('Error retrieving data from Firestore:', error);
    }
  };

  const rb = getDatabase();
  const problemsRef = ref(rb);
  const [previousCount, setPreviousCount] = useState(null);
    
  useEffect(() => {
    const unsubscribe = onValue(problemsRef, (snapshot) => {
    const data = snapshot.val();
    
    // Only trigger when the userCount changes
    if (data && data.count !== previousCount) {
        console.log('User count changed:', data.count);
        setPreviousCount(data.count);
        handleDisplayText(data.count);
      }
    });
    
    return () => {
    // Cleanup the listener when the component unmounts
      unsubscribe();
    };
  }, [problemsRef, previousCount]);


  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h2 className="text-lg font-bold text-red-950 mb-4">Meeting Page</h2>

      <div className=" p-4 mb-4">
        {/* Read-only text display box */}
        <div className="flex flex-col justify-between w-[500px] h-[300px] bg-white p-4 mx-10 overflow-y-auto">
          {displayText}
        </div>
      </div>
      <div className="flex flex-col justify-between w-[500px] h-[300px] bg-white p-4 mx-10 overflow-y-auto">
      {/* Textbox in the bottom middle */}
        <textarea
          type="text"
          placeholder="Enter text"
          value={inputText}
          onChange={handleInputChange}
          className="border p-2 rounded resize-none h-full w-full"
        />

        {/* Button to update display text */}
        <button
          className="bg-blue-500 text-white py-1 px-4 rounded hover:bg-blue-600 ml-2"
          onClick={handleDisplayText}
          disabled={!inputText.trim()}
        >
          Kaydet
        </button>
        </div>
    </div>
  );
}

export default Meeting;
