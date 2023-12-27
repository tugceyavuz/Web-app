'use client' 
// Import necessary dependencies and components
import React, { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, getDocs, doc, getDoc, arrayUnion } from 'firebase/firestore';
import { set, ref, push, update, getDatabase, get, setDoc, onValue } from 'firebase/database';
import { useRouter } from 'next/navigation';
import { db } from '/firebase/config';
import { useFormik } from 'formik';
import * as Yup from 'yup';

function VotePage() {
  const [pollOptions, setPollOptions] = useState([]);
  const router = useRouter();
  const [problemData, setProblemData] = useState(null);
  const [userId, setUserId] = useState('');
  const [selectedProblem, setSelectedProblem] = useState('');
  const [eventId, setEventId] = useState('');
  const [timer, setTimer] = useState(300); // 5 minutes in seconds
  const [isTeamLeader, setIsTeamLeader] = useState(false);
  const [isEnded, setIsEnded] = useState(false);

  async function fetchUrl() {
    setUserId(localStorage.getItem('userId'));
    setSelectedProblem(localStorage.getItem('selectedProblem'));
    setEventId(localStorage.getItem('eventId'));
  }

  useEffect(() => {
    fetchUrl();
  }, []);

  useEffect(() => {
    const timerInterval = setInterval(() => {
      setTimer((prevTimer) => prevTimer - 1);
    }, 1000);

    // Clear the interval when the component is unmounted
    return () => clearInterval(timerInterval);
  }, []); // Empty dependency array ensures it runs only once on mount

  useEffect(() => {
    if (timer === 0) {
      // Handle timer expiration, for example, redirect the user or perform some action
      clearInterval(timerInterval);
    }
  }, [timer]);

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
  };

  const formik = useFormik({
    initialValues: {
      selectedOptions: [],
    },
    onSubmit: (values) => {
      const docRef = doc(db, 'events', eventId);
      const eventSnapshot = getDoc(docRef);

      if (eventSnapshot.exists()) {
        const problems = eventSnapshot.data().problems;
        const selectedProblemData = problems.find((item) => item.id === selectedProblem);

        if (selectedProblemData) {
          setProblemData(selectedProblemData);
          setPollOptions(selectedProblemData.poll);

          // Handle form submission, e.g., update votes in the Firestore database
          try {
            const db = getFirestore();

            for (const selectedOption of values.selectedOptions) {
              const updatedPollOptions = selectedProblemData.poll.map(option => {
                if (option.name === selectedOption) {
                  // Increment the vote count for the selected option
                  return { ...option, votes: (option.votes || 0) + 1 };
                }
                return option;
              });

              // Update the poll array with the new vote count in the Firestore database
              updateDoc(docRef, {
                problems: problems.map(problem => {
                  if (problem.id === selectedProblem) {
                    return { ...problem, poll: updatedPollOptions };
                  }
                  return problem;
                })
              });

              console.log(`Vote for ${selectedOption} incremented.`);

              if (isTeamLeader) {router.push('/end');}

            }

            // Additional logic as needed

          } catch (error) {
            console.error('Error updating votes:', error);
          }
        }
      }
    },
  });

  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;

  const setFinished = async () => {
    try {
      if (selectedProblem) {
        const rb = getDatabase();
        const problemRef = ref(rb, selectedProblem);
  
        // Fetch the problem data using get()
        const snapshot = await get(problemRef);
  
        if (snapshot.exists()) {
          // Update the isActive field to false
          await update(problemRef, {
            isActive: false,
          });
          setIsEnded(true);
  
          console.log('Problem marked as finished.');
        } else {
          console.error('Problem document does not exist.');
        }
      }
    } catch (error) {
      console.error('Error updating problem data:', error);
    }
  };

  useEffect(() => {
    const checkIfProblemIsFinished = async () => {
      try {
        if (selectedProblem) {
          const rb = getDatabase();
          const problemRef = ref(rb, selectedProblem);
  
          // Fetch the problem data using get()
          const snapshot = await get(problemRef);
  
          if (snapshot.exists()) {
            const isActive = snapshot.val().isActive;
            console.log('isActive:', isActive);
            if (!isActive) {
              // Redirect to '/meeting-page' if the problem is finished
              router.push('/end');
            }
          } else {
            console.error('Problem document does not exist.');
          }
        }
      } catch (error) {
        console.error('Error checking if the problem is finished:', error);
      }
    };
  
    // Call the function when the component mounts and when `isEnded` changes
    checkIfProblemIsFinished();
  }, [isEnded]);
  
  

  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      
        <p className="text-red-950 font-bold mx-2">{"Timer:"}</p>
        <p className="text-red-950 font-bold mx-2"> {`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`} </p>

        {/* Display problem data */}
        {problemData && (
          <div className="p-4 flex-middle mb-4">
            <h3 className="text-md text-red-950 font-bold mb-2">{"Problem Name: " + problemData.name}</h3>
            <p>{"Context: " + problemData.context}</p>
          </div>
        )}
      
      {/* Poll container */}
      <div className="w-96" style={{height: "calc(100vh - 185px)"}}>
        <h1 className="text-2xl text-red-950 font-bold mt-4 mb-6">Poll Options</h1>

        <div className="bg-white p-1 rounded shadow-md w-96 h-[400px] overflow-y-auto">
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
              className="bg-red-950 text-white px-4 py-2 mt-4 rounded hover:bg-red-950"
              onClick={(e) => {
                e.preventDefault(); // Prevents the default form submission

                if (isTeamLeader) {
                  formik.handleSubmit(e);
                  // If the user is a team leader, perform team leader action
                  console.log('Team Leader Action');
                  setFinished();
                } else {
                  // If the user is not a team leader, perform regular user action
                  formik.handleSubmit(e);
                }
              }}
            >
            {isTeamLeader ? 'End Session' : 'Submit Vote'}
          </button>
      </div>
    </div>
  );
}

export default VotePage;
