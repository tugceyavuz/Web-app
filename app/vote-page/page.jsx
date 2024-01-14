'use client' 
// Import necessary dependencies and components
import React, { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, getDocs, doc, getDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { set, ref, push, update, getDatabase, get, setDoc, onValue } from 'firebase/database';
import { useRouter } from 'next/navigation';
import { db } from '/firebase/config';
import { useFormik } from 'formik';
import { Alert } from '@mui/material';
import * as Yup from 'yup';

function VotePage() {
  const [pollOptions, setPollOptions] = useState([]);
  const router = useRouter();
  const [problemData, setProblemData] = useState(null);
  const [userId, setUserId] = useState('');
  const [selectedProblem, setSelectedProblem] = useState('');
  const [eventId, setEventId] = useState('');
  const [optionNum, setOptionNum] = useState(5);
  const [isTeamLeader, setIsTeamLeader] = useState(false);
  const [buttonClicked, setButtonClicked] = useState(false);
  const [isOptionNumOk, setIsOptionNumOk] = useState(false);
  const [countdown, setCountdown] = useState(5*60);

  const calculateOptionNum = () => {
    try {
      if (selectedProblem && pollOptions.length > 0) {
        const rb = getDatabase();
        const problemRef = ref(rb, selectedProblem);  
        onValue(problemRef, (snapshot) => {
          const userCount = snapshot.val()?.userCount;
          setOptionNum(Math.ceil(pollOptions.length / userCount));
        });
      }
    } catch (error) {
      console.error('Error fetching problem data:', error);
    }
  }

  useEffect(() => {
    console.log('pollOptions', pollOptions);  
    calculateOptionNum();
  }, [pollOptions]);

  async function fetchUrl() {
    setUserId(localStorage.getItem('userId'));
    setSelectedProblem(localStorage.getItem('selectedProblem'));
    setEventId(localStorage.getItem('eventId'));
  }

  useEffect(() => {
    fetchUrl();
  }, []);

  const fetchProblemData = async () => {
    try {
      const docRef = doc(db, 'events', eventId);
      const eventSnapshot = await getDoc(docRef);

      if (eventSnapshot.exists()) {
        const problems = eventSnapshot.data().problems;
        const selectedProblemData = problems.find((item) => item.id === selectedProblem);

        if (selectedProblemData) {
          setProblemData(selectedProblemData);
          setPollOptions(selectedProblemData.poll);
        } else {
          console.error('Selected problem not found in events collection.');
        }
      } else {
        console.error('Event document does not exist.');
      }
    } catch (error) {
      console.error('Error fetching problem data:', error);
    }
  };

  useEffect(() => {
    fetchProblemData();
  }, [selectedProblem, eventId]);

  const isTeamLeaderCheck = async () => {
    try {
      if (selectedProblem && userId) {
        const rb = getDatabase();
        const Ref = ref(rb, selectedProblem);
  
        // Fetch the teamLeaderId data using get()
        const teamLeaderIdSnapshot = await get(Ref);
  
        if (teamLeaderIdSnapshot.exists()) {
          const teamLeaderId = teamLeaderIdSnapshot.val().teamLeaderId;
  
          // Check if the logged-in user is the team leader
          if (teamLeaderId === userId) {
            setIsTeamLeader(true);
          } else {
            setIsTeamLeader(false);
          }
        } else {
          console.error('Event document does not exist.');
        }
      }
    } catch (error) {
      console.error('Error fetching problem data:', error);
    }
  };

  useEffect(() => {
    isTeamLeaderCheck();
  }, [selectedProblem, userId]);
  
  const handleToggleOption = (option) => {
    const { selectedOptions } = formik.values;
    const updatedSelectedOptions = selectedOptions.includes(option)
      ? selectedOptions.filter((selected) => selected !== option)
      : [...selectedOptions, option];

    formik.setFieldValue('selectedOptions', updatedSelectedOptions);
    setIsOptionNumOk(updatedSelectedOptions.length >= optionNum);
  };

  const formik = useFormik({
    initialValues: {
      selectedOptions: [],
    },
    onSubmit: async (values) => {
      try {
        const docRef = doc(db, 'events', eventId);
        const eventSnapshot = await getDoc(docRef);
    
        if (eventSnapshot.exists()) {
          const problems = eventSnapshot.data().problems;
          const selectedProblemData = problems.find((item) => item.id === selectedProblem);
    
          if (selectedProblemData) {
            const updatedPollOptions = selectedProblemData.poll.map(option => {
              if (values.selectedOptions.includes(option.name)) {
                // Increment the vote count for the selected option
                return { ...option, vote: (option.vote || 0) + 1 };
              }
              return option;
            });
    
            // Update the poll array with the new vote count in the Firestore database
            await updateDoc(docRef, {
              problems: problems.map(problem => {
                if (problem.id === selectedProblem) {
                  return { ...problem, poll: updatedPollOptions };
                }
                return problem;
              })
            });
    
            console.log('Votes incremented successfully.');
    
            // Additional logic as needed
    
          } else {
            console.error('Selected problem not found in events collection.');
          }
        } else {
          console.error('Event document does not exist.');
        }
      } catch (error) {
        console.error('Error updating votes:', error);
      }
    }
  });

  const setFinished = async () => {
    try {
      if (selectedProblem && eventId) {
        const rb = getDatabase();
        const problemRef = ref(rb, selectedProblem);
  
        // Fetch the problem data using get()
        const snapshot = await get(problemRef);
  
        if (snapshot.exists()) {
          // Update the isActive field to false
          
          await update(problemRef, {
            isActive: false,
            isVoteActive: false,
          });

          // Get a reference to the specific event
          const eventRef = doc(db, 'events', eventId);

          // Retrieve the current event data
          const eventDoc = await getDoc(eventRef);

          if (!eventDoc.exists()) {
            console.log('Event not found');
            return;
          }

          // Clone the problems array to avoid modifying the original array directly
          const updatedProblems = [...(eventDoc.data().problems || [])];

          // Find the index of the problem to update
          const indexToUpdate = updatedProblems.findIndex(problem => problem.id === selectedProblem);

          // If the problem is found, update it
          if (indexToUpdate !== -1) {
            updatedProblems[indexToUpdate] = { ...updatedProblems[indexToUpdate], isActive: false };
          }

          // Update the entire array within the event document
          await updateDoc(eventRef, { problems: updatedProblems });

          router.push('/end');
  
          console.log('Problem marked as finished.');
        } else {
          console.error('Problem document does not exist.');
        }
      }
    } catch (error) {
      console.error('Error updating problem data:', error);
    }
  };

  const checkIsActive = () => {
    if (selectedProblem){
      const rb = getDatabase();
      const problemRef = ref(rb, selectedProblem);
    
      onValue(problemRef, (snapshot) => {
        const isActive = snapshot.val()?.isActive;
    
        if (isActive === false) {
          // Problem is not active, redirect to '/end'
          router.push('/end');
        }
      });
    }
  };
  
  // Call the function when the component mounts
  useEffect(() => {
    checkIsActive();
  }, [selectedProblem, router]);

  useEffect(() => {
    let countdownInterval;

    countdownInterval = setInterval(() => {
      setCountdown((prevCountdown) => {
        if (prevCountdown <= 0) {
          clearInterval(countdownInterval);
          // Reset the countdown locally
          setCountdown(0);
        }
        return prevCountdown - 1;
      });
    }, 1000);

    // Cleanup the listener and interval when the component unmounts or when isCountdownActive becomes false
    return () => {
      clearInterval(countdownInterval);
    };

  }, []);
  

  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <p className="text-red-950 font-bold mx-2"> {"Timer:"} </p>
      {<p className="text-red-500">{`${Math.floor(countdown / 60)}:${countdown % 60}`}</p>}
    
        {/* Display problem data */}
        {problemData && (
          <div className="p-4 flex-middle">
            <h3 className="text-md text-red-950 font-bold mb-2">{"Problem Name: " + problemData.name}</h3>
            <p>{"Context: " + problemData.context}</p>
          </div>
        )}
      
      {/* Poll container */}
      <div className="w-[50%]" style={{height: "calc(100vh - 185px)"}}>
        <h1 className="text-2xl text-red-950 font-bold mt-2 ">Poll Options</h1>
        <p className='font-bold text-red-600'>{"Choose at least: " + optionNum +  " option!"}</p>

        <div className="bg-white p-1 rounded shadow-md w-full overflow-y-auto" style={{height: "calc(100vh - 260px)"}}>
          <form onSubmit={formik.handleSubmit}>
              <ul>
                {pollOptions.map((option, index) => (
                  <li key={index} className="mb-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="selectedOptions"
                        value={option.name}
                        checked={formik.values.selectedOptions.includes(option.name)}
                        onChange={() => handleToggleOption(option.name)}
                        className="mr-2"
                      />
                      {option.name}
                    </label>
                  </li>
                ))}
              </ul>
              
            </form>
        </div>
          <button
          type="submit"
          className={`bg-red-950 text-white px-4 py-2 mt-4 rounded hover:bg-red-950 ${buttonClicked || !isOptionNumOk ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            if (!buttonClicked) {
              if (isTeamLeader) {
                formik.handleSubmit(e);
                console.log('Team Leader Action');
                setFinished();
              } else {
                formik.handleSubmit(e);
              }
              setButtonClicked(true);
            }
          }}
          >
          {isTeamLeader ? 'End Session' : 'Submit Vote'}
        </button>
        {buttonClicked && (
          <Alert severity="success">Votes Saved!</Alert>
        )}
      </div>
    </div>
  );
}

export default VotePage;
