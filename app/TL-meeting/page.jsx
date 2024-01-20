'use client'  
import React from 'react';
import { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, getDocs, doc, getDoc,arrayUnion } from 'firebase/firestore';
import { set, ref, push, update, getDatabase, get, setDoc, onValue } from 'firebase/database';
import { useRouter } from 'next/navigation';
import { db } from '/firebase/config';
import { OpenAIApi, Configuration } from "openai" ;
import { Alert } from '@mui/material';
import axios from 'axios';

function TlMeeting() {
  const router = useRouter();
  const timerAmount = 10;
  const [displayText, setDisplayText] = useState('');
  const [GptInput2, setGptInput2] = useState('')
  const [inputText, setInputText] = useState('');
  const [userId, setUserId] = useState('');
  const [selectedProblem, setSelectedProblem] = useState('');
  const [eventId, setEventId] = useState('');
  const [count, setCount] = useState(0);
  const [problemData, setProblemData] = useState(null);
  const [countdown, setCountdown] = useState(timerAmount); 
  const [GptInput, setGptInput] = useState('');
  const [buttonClicked, setButtonClicked] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  async function fetchUrl() {
      setUserId(localStorage.getItem('userId'));
      setSelectedProblem(localStorage.getItem('selectedProblem'));
      setEventId(localStorage.getItem('eventId'));
  }
 
  useEffect(() => {
    fetchUrl();
  }, []);

  const fetchUSR = async () => {
      const rb = getDatabase();
      const problemRef = ref(rb, selectedProblem);

      // Subscribe to changes on the specified location
      const unsubscribe = onValue(problemRef, (snapshot) => {
          // The callback function is called whenever there's a change in the data
          const data = snapshot.val();
          
          // Ensure data exists
          if (data !== null) {
              setUserId(data.teamLeaderId);
          }
      });

      // Return a cleanup function to unsubscribe when the component unmounts
      return () => {
          // Cleanup the listener when the component unmounts
          unsubscribe();
      };
  }

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
              
              setDisplayText(<ul>{displayText}</ul>);
              setInputText('');

            const combinedText = pagesData
                .slice(0, Count)
                .map((page) => page.textVal)
                .join(',');
              
              setGptInput2(combinedText);
              // Update your state or UI as needed     
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

  const handleSave = async () => { 
      try {
        console.log("team leader userId: " + userId);
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

  const handleSaveGPT = async (response) => { 
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
                  const partipicantIndex = partipicants.findIndex(partipicant => partipicant.name === "GPT");
                  if (partipicantIndex !== -1) {
                      // Save the inputText under the pages array as a new element
                      const updatedPartipicants = [...partipicants];
                      updatedPartipicants[partipicantIndex].pages.push({ name: "GPT", textVal: response });
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
      if (selectedProblem && eventId) {
        const docRef = doc(db, 'events', eventId);
        const eventSnapshot = await getDoc(docRef);
        console.log(eventSnapshot.data().problems);
        eventSnapshot.data().problems.forEach((item) => {
          if (item.id === selectedProblem) {
            setProblemData(item);
          } else {
            console.error('Selected problem not found in events collection.');
          }
        });
      }
    } catch (error) {
      console.error('Error fetching problem data:', error);
    }
  };
  
  useEffect(() => {
    if (problemData) {   
      console.log(problemData.context);
      const newGptInput = "write 3 short solution with maximum 3 sentence for each, for problem: " + problemData.context;
      setGptInput(newGptInput);
      console.log(newGptInput); // Log the updated value here
    }
  }, [problemData]);

  const gptInputDetector = async () => {
      const docRef = doc(db, 'events', eventId);
      const eventSnapshot = await getDoc(docRef);
  
      eventSnapshot.data().problems.forEach((item) => {

        if (item.id == selectedProblem) {
          const participantData = item.partipicant.find((participant) => participant.name === "GPT");
  
          if (participantData) {
            // Assuming 'pages' is an array inside 'partipicant'
            const pagesData = participantData.pages || [];
            const combinedText = pagesData
                .map((page) => page.textVal)
                .join(',');
              
            const newGptInput = "write 3 short solution with maximum 3 sentence for each, for problem: " + problemData.context + " and consider (if meanengless, ignore this): " + combinedText;
            setGptInput(newGptInput);  
          } else {
            console.error('Participant not found in selected problem.');
          }
        }
      }); 
  }

  useEffect( () => {
    if (problemData) {
      gptInputDetector();
    }
  }, [GptInput2]);

  useEffect(() => {
    fetchProblemData();
  }, [selectedProblem, eventId]);

  const handleCountdown = async () => {
    if(selectedProblem){   
      let countdownInterval;

      const rb = getDatabase();
      const problemRef = ref(rb, selectedProblem);

      const unsubscribe = onValue(problemRef, (snapshot) => {
        const data = snapshot.val();

        // Ensure data exists and isCountdownActive is explicitly true
        if (data !== null && data.isCountdownActive && countdown > 0) {
          setIsButtonDisabled(true);
          console.log('Countdown started: ' + isButtonDisabled);
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
                console.log('Countdown started: ' + isButtonDisabled);
                console.log('countdown countdown: ' + countdown);
                setIsButtonDisabled(false);
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
  }

  useEffect(() => {
    if(problemData){
      fetchUSR();
    }
    handleCountdown();
  }, [selectedProblem]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
  };

  const handlePageChange = async () => {
    if (selectedProblem) {
      // Initialize Firebase Realtime Database
      const rb = getDatabase();
      const problemRef = ref(rb, selectedProblem);
  
      // Get the document reference from Firestore
      const eventDocRef = doc(db, 'events', eventId);
      const eventSnapshot = await getDoc(eventDocRef);
      
      // Update the count in the Realtime Database
      // Fetch the current data using get()
      const snapshot = await get(problemRef);
      const currentCount = snapshot.val().count || 0;
      update(problemRef, { count: currentCount + 1 });
  
      // Update the pages in Firestore
      const problemsArray = eventSnapshot.data().problems;

      const updatedProblemsArray = problemsArray.map((item) => {
        if (item.id === selectedProblem && item.partipicant) {
          const users = item.partipicant;

          // Ensure that participants array is not empty
          if (users.length > 0) {
            const lastElement = users[users.length - 1].pages;

            for (let i = users.length - 1; i > 0; i--) {
              users[i].pages = users[i - 1].pages;
            }

            users[0].pages = lastElement;

            return { ...item, partipicant: users };
          }
        }
        return item;
      });

      // Update the document in Firestore with the modified problems array
      await updateDoc(eventDocRef, { problems: updatedProblemsArray });
    }
  };

  const handleGPTUser = async () => {
    const url = 'https://api.openai.com/v1/chat/completions';
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
    };
    const data = {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: GptInput }],
    };
  
    try {
      axios.post(url, data, { headers: headers }).then((response) => {
        console.log(response.data.choices[0].message.content);
        handleSaveGPT(response.data.choices[0].message.content);
      });

    } catch (error) {
      if (error.response) {
        console.error('Response Error:', error.response.data);
      } else if (error.request) {
        console.error('Request Error:', error.request);
      } else {
        console.error('Error:', error.message);
      }
    }
  };
  
  return (
    <div className='relative z-0 flex h-full w-full overflow-auto'>
      {/* Sidebar */}
      <div className="flex flex-col items-center justify-start h-screen p-4 bg-red-950 bg-opacity-95">
        {/* Spacer to push buttons to the middle */}
        <div className="flex-grow"></div>
        {/* Button 1 */}
        <button
          className="mb-5 p-2 w-[160px] h-[80px] bg-red-900 text-white rounded hover:bg-red-600"
          disabled={isButtonDisabled}
          onClick={() => {
            console.log('Start timer clicked.');
            if (selectedProblem) {
              const rb = getDatabase();
              const problemRef = ref(rb, selectedProblem);
              if (countdown >= 0) {
                update(problemRef, {
                  isCountdownActive: true,
                });
                if(problemData) handleGPTUser();
              } else {
                update(problemRef, {
                  isCountdownActive: false,
                });
              }
            }
          }}
        >
          Start Timer
        </button>

        {/* Button 2 */}
        <button className="mb-5 p-2 w-[160px] h-[80px] bg-red-900 text-white rounded hover:bg-red-600"
          disabled={isButtonDisabled}
          onClick={handlePageChange}
        >
          Change Pages
        </button>

        {/* Button 3 */}
        <button className="mb-5 p-2 w-[160px] h-[80px] bg-red-900 text-white rounded hover:bg-red-600"
          disabled={isButtonDisabled}
          onClick={() => {router.push('/TL-editor');}}
        >
          End Process / Go to Editing
        </button>

        {/* Spacer to push buttons to the middle */}
        <div className="flex-grow"></div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center h-screen w-full">
        {/* Countdown timer */}
        <p className="text-red-950 font-bold mx-2">{"Timer:"}</p>
        <p className="text-red-500">{`${Math.floor(countdown / 60)}:${countdown % 60}`}</p>

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

          {/* Button to update display text */}
          <button
            className={`bg-red-950 bg-opacity-95 text-white py-1 px-4 rounded hover:bg-red-950 ml-2 ${buttonClicked || countdown == timerAmount? 'cursor-not-allowed opacity-50' : ''}`}
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

export default TlMeeting