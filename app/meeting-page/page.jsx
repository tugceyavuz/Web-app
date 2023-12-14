'use client'  
import React from 'react';
import { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, getDocs, doc, getDoc,arrayUnion } from 'firebase/firestore';
import { set, ref, push, update, getDatabase, get, setDoc, onValue } from 'firebase/database';
import { useRouter } from 'next/navigation';
import { db } from '/firebase/config';

function Meeting() {
  const router = useRouter();
  const [displayText, setDisplayText] = useState('');
  const [inputText, setInputText] = useState('');
  const [userId, setUserId] = useState('');
  const [selectedProblem, setSelectedProblem] = useState('');
  const [eventId, setEventId] = useState('');
  const [count, setCount] = useState(0);
  const [teamLeaderId, setTeamLeaderId] = useState('');

  const handleInputChange = (e) => {
    setInputText(e.target.value);
  };

  async function fetchUrl() {
    setUserId(localStorage.getItem('userId'));
    setSelectedProblem(localStorage.getItem('selectedProblem'));
    setEventId(localStorage.getItem('eventId'));
  }
 
  useEffect(() => {
    fetchUrl();
  }, []);

  const handleDisplayText = async (Count) => {
    try {

      if (!userId || !selectedProblem) {
        console.error('User ID or selected problem not found in localStorage.');
        return;
      }
  
      if (!userId || !selectedProblem) {
        console.error('User ID or selected problem not found in localStorage.');
        return;
      }
  
      const docRef = doc(db, 'events', eventId);
      const eventSnapshot = await getDoc(docRef);
  
      eventSnapshot.data().problems.forEach((item) => {

        if (item.id == selectedProblem) {
          // Check if participants array exists
          const participantData = item.partipicant.find((participant) => participant.id === userId);
  
          if (participantData) {
            // Assuming 'pages' is an array inside 'partipicant'
            const pagesData = participantData.pages || [];

            // Display information about the user and pages up to the specified count
            const displayText = pagesData
                .slice(0, Count)
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

  async function updateTL() {
    if(selectedProblem)
      {
        const rb = getDatabase();
        const Ref = ref(rb, selectedProblem);
        const unsubscribe = onValue(Ref, (snapshot) => {
        const data = snapshot.val();
 
        // Ensure data exists
        if (data !== null) {

          const newTL = data.teamLeaderId;
          // Only trigger when any count changes
          if (newTL !== teamLeaderId && newTL == userId) {
            console.log('teamLeaderId changed:', newTL);
            setTeamLeaderId(newTL);  
            router.push('/TL-meeting');
          }
        }
        });
 
        return () => {
          // Cleanup the listener when the component unmounts
          unsubscribe();
        };
      }
  }

  useEffect(() => {  
    updateTL();
  }, [teamLeaderId, selectedProblem]);


  async function updateCount() {
    if(selectedProblem)
      {
        const rb = getDatabase();
        const Ref = ref(rb, selectedProblem);
        const unsubscribe = onValue(Ref, (snapshot) => {
        const data = snapshot.val();
 
        // Ensure data exists
        if (data !== null) {

          const newCount = data.count;
          // Only trigger when any count changes
          if (newCount !== count) {
            console.log('Count changed:', newCount);
            setCount(newCount);  
            handleDisplayText(newCount);
          }
        }
        });
 
        return () => {
          // Cleanup the listener when the component unmounts
          unsubscribe();
        };
      }
  }

  useEffect(() => {  
    updateCount();
  }, [count, selectedProblem]);


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
