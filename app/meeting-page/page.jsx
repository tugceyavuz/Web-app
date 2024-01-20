'use client'  
import React from 'react';
import { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, getDocs, doc, getDoc,arrayUnion } from 'firebase/firestore';
import { set, ref, push, update, getDatabase, get, setDoc, onValue } from 'firebase/database';
import { useRouter } from 'next/navigation';
import { db } from '/firebase/config';
import { Alert } from '@mui/material';


function Meeting() {
  const router = useRouter();
  const timerAmount = 20;
  const [displayText, setDisplayText] = useState('');
  const [inputText, setInputText] = useState('');
  const [userId, setUserId] = useState('');
  const [selectedProblem, setSelectedProblem] = useState('');
  const [eventId, setEventId] = useState('');
  const [count, setCount] = useState(0);
  const [teamLeaderId, setTeamLeaderId] = useState('');
  const [problemData, setProblemData] = useState(null);
  const [isVoteActive, setIsVoteActive] = useState(false);
  const [countdown, setCountdown] = useState(timerAmount); 
  const [buttonClicked, setButtonClicked] = useState(false);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
  };

  const handleSave = async () => { 
      try {
        if(selectedProblem && userId && eventId)
        { 
          const docRef = doc(db, 'events', eventId);
          const eventSnapshot = await getDoc(docRef);

          if (!eventSnapshot.exists()) {
            console.error('Event not found in Firestore.');
            return;
          }

          const eventData = eventSnapshot.data();
          const updatedProblems = eventData.problems.map((item) => {
            if (item.id === selectedProblem) {
                  const partipicants = item.partipicant || [];
                  const partipicantIndex = partipicants.findIndex(partipicant => partipicant.id === userId);
                  if (partipicantIndex !== -1) {
                      const partipicantName = partipicants[partipicantIndex].name;

                      // Save the inputText under the pages array as a new element
                      const updatedPartipicants = [...partipicants];
                      updatedPartipicants[partipicantIndex].pages.push({ name: partipicantName, textVal: inputText });
                      return {
                        ...item,
                        partipicant: updatedPartipicants,
                      };
                  }     
            }
            return item;
          });
      
          // Update the entire document with the modified problems array
          await updateDoc(docRef, {
            problems: updatedProblems,
          });
        }
    } catch (error) {
        console.error('Error saving inputText:', error);
    }
  }

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
          // Check if partipicants array exists
          const partipicantData = item.partipicant.find((partipicant) => partipicant.id === userId);
          console.log(partipicantData.name);
          if (partipicantData) {
            // Assuming 'pages' is an array inside 'partipicant'
            const pagesData = partipicantData.pages || [];
            console.log(pagesData);

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
            console.error('Partipicant not found in selected problem.');
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
            
              // Introduce a delay before calling handleDisplayText
              setTimeout(() => {
                handleDisplayText(newCount);
                setButtonClicked(false);
              }, 100); 
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

  const fetchProblemData = async () => {
    try {
      const docRef = doc(db, 'events', eventId);
      const eventSnapshot = await getDoc(docRef);
      console.log(eventSnapshot.data().problems);
      eventSnapshot.data().problems.forEach((item) => {
        if (item.id == selectedProblem) {
            setProblemData(item);
        } else {
          console.error('Selected problem not found in events collection.');
        }
      });
    } catch (error) {
      console.error('Error fetching problem data:', error);
    }
  };

  useEffect(() => {
    fetchProblemData();
  }, [selectedProblem, eventId]);

  useEffect(() => {
    if(selectedProblem){
      let countdownInterval;

      const rb = getDatabase();
      const problemRef = ref(rb, selectedProblem);

      const unsubscribe = onValue(problemRef, (snapshot) => {
        const data = snapshot.val();

        // Ensure data exists and isCountdownActive is explicitly true
        if (data !== null && data.isCountdownActive && countdown > 0) {
          // Start the countdown
          countdownInterval = setInterval(() => {
            setCountdown((prevCountdown) => {
              if (prevCountdown <= 0) {
                clearInterval(countdownInterval);

                // Reset the countdown locally
                setCountdown(timerAmount);

                // Update the isCountdownActive value to false in the database
                update(problemRef, {
                  isCountdownActive: false,
                });
              }
              return prevCountdown - 1;
            });
          }, 1000);
        } else {
          // If isCountdownActive is false or undefined, reset the countdown
          clearInterval(countdownInterval);
          setCountdown(timerAmount);
        }
      });

      // Cleanup the listener and interval when the component unmounts or when isCountdownActive becomes false
      return () => {
        clearInterval(countdownInterval);
        unsubscribe();
      };
    }
  }, [selectedProblem]);

  useEffect(() => {  
    handleVotePage();
  }, [isVoteActive, selectedProblem]);
  
  const handleVotePage = async () => {
    if(selectedProblem)
      {
        const rb = getDatabase();
        const Ref = ref(rb, selectedProblem);
        const unsubscribe = onValue(Ref, (snapshot) => {
        const data = snapshot.val();
 
        // Ensure data exists
        if (data !== null) {
          if(data.isVoteActive){
            setIsVoteActive(true);
            router.push('/vote-page');
          }
        }
        });
 
        return () => {
          // Cleanup the listener when the component unmounts
          unsubscribe();
        };
      }

  };


  return (
    <div className='relative z-0 flex h-full w-full overflow-auto'>
      {/* Countdown timer */}
      <p className="text-red-950 font-bold mx-2"> {"Timer:"} </p>
      {<p className="text-red-500">{`${Math.floor(countdown / 60)}:${countdown % 60}`}</p>}
    <div className="flex flex-col items-center justify-center h-screen">
      {/* Display problem data */}
      {problemData && (
            <>
              <h3 className="text-md text-red-950 font-bold mb-2">{"Problem Name: " + problemData.name}</h3>
              <p>{"Context: " + problemData.context}</p>
            </>
          )}
      <div className="p-4 mb-4">
        
        {/* Read-only text display box */}
        <div className="flex flex-col justify-between w-[500px] h-[300px] bg-white p-4 mx-10 overflow-y-auto"> 
          {/* Display additional text */}
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

        {/* Button to save */}
        <button
            className={`bg-red-950 bg-opacity-95 text-white py-1 px-4 rounded hover:bg-red-950 ml-2 ${buttonClicked || countdown == timerAmount ? 'cursor-not-allowed opacity-50' : ''}`}
            disabled={!inputText.trim() || countdown == timerAmount}
            onClick={(e) => {
              e.preventDefault();
              if (!buttonClicked) {
                handleSave();
                setButtonClicked(true);
              }
            }} 
          >
            Save
          </button>
          {buttonClicked && (
            <Alert severity="success">Answer Saved!</Alert>
          )}
        </div>
    </div>
    </div>
  );
}

export default Meeting;
