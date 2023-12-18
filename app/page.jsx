'use client'
import { useState, useEffect } from 'react';
import { db } from '@/firebase/config';
import { collection, getDocs  } from 'firebase/firestore';
import { updateDoc } from 'firebase/firestore'
import { set, ref, push, update, getDatabase, get, setDoc, onValue } from 'firebase/database';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

const Home = () => {
  const router = useRouter();
  const [selectedProblem, setSelectedProblem] = useState('');
  const [isim, setIsim] = useState('');
  const [problemOptions, setProblemOptions] = useState([]);
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);

  useEffect(() => {
    // Initialize Firebase Realtime Database
    const rb = getDatabase();
    const problemsRef = ref(rb); // Assuming your problems are stored under the 'problems' node

    // Listen for changes in the problems node
    const unsubscribe = onValue(problemsRef, (snapshot) => {
      const data = snapshot.val();

      if (data) {
        const problems = [];

        // Iterate through each problem in the data
        Object.keys(data).forEach((problemKey) => {
          const problem = data[problemKey];

          // Check if the problem is active
          if (problem.isActive) {
            const problemName = problem.name; // Assuming each problem has a 'name' property

            // Add the problem name to the problems array
            problems.push(problemName);
          }
        });

        // Set the problems array as the options
        setProblemOptions(problems);
      }
    });

    // Cleanup the listener when the component unmounts
    return () => {
      unsubscribe();
    };
  }, []);// Empty dependency array means this effect runs once on mount

  const handleProblemChange = (event) => {
    setSelectedProblem(event.target.value);
  };

  const handleIsimChange = (event) => {
    const newName = event.target.value;
    setIsim(newName);

    // Enable or disable the button based on whether a name is entered
    setIsButtonDisabled(!newName.trim());
  };

  //add user to the problem
  const handleJoinClick = async () => {
    try {
      // Validate that 'selectedProblem' and 'isim' are not empty
      if (!selectedProblem || !isim) {
        console.error('Invalid input: selectedProblem and isim are required.');
        return;
      }
  
      // Create a UUID for the user
      const userId = uuidv4();
      localStorage.setItem('userId', userId);
  
      // Update Firestore to add the user to the chosen problem's participants array
      const eventsCollection = collection(db, 'events');
      const eventsSnapshot = await getDocs(eventsCollection);
  
      eventsSnapshot.forEach((doc) => {
        const eventData = doc.data();
        const eventProblems = eventData.problems || [];
  
        // Find the chosen problem by name
        const chosenProblemIndex = eventProblems.findIndex((problem) => problem.name === selectedProblem);
  
        if (chosenProblemIndex !== -1) {
          // Chosen problem exists, check if participants array exists
          const chosenProblem = eventProblems[chosenProblemIndex];
          const eventId = doc.id;
          localStorage.setItem('eventId', eventId);
          localStorage.setItem('selectedProblem', chosenProblem.id);
          
          // Create participants array if it doesn't exist
          if (!chosenProblem.hasOwnProperty('partipicant')) {
            chosenProblem.partipicant = [];
          }
  
          // Get the existing problems array
          const updatedProblems = [...eventProblems];
  
          // Update the participants array inside the specified problem
          updatedProblems[chosenProblemIndex] = {
            ...chosenProblem,
            partipicant: [
              ...chosenProblem.partipicant,
              {
                id: userId,
                name: isim,
                pages: [{ name: isim, textVal: '' }],
              },
            ],
          };
  
          // Update Firestore with the new participant
          updateDoc(doc.ref, { problems: updatedProblems });

          increaseUserCount(chosenProblem);
  
          // Redirect the user to the meeting page
          router.push('/meeting-page');
        }
      });
    } catch (error) {
      console.error('Error updating Firestore:', error);
    }
  };

  const increaseUserCount = async (problem) => {
    try {
      const size = problem.partipicant.length + 1;
      const id = problem.id;
  
      const db = getDatabase();
      const problemRef = ref(db, id);
      // Update the userCount value for the specified problem
      await update(problemRef, {
        userCount: size,
      });
  
      console.log(`User count updated for problem ${id}: ${size}`);
    } catch (error) {
      console.error('Error updating user count:', error);
    }
  };

  return (
    <section className="w-full flex-center flex-col h-screen">  
      {/* Dropdown list for "problemler" */}
      <div className="text-center mb-4">
        <select
          id="problemDropdown"
          value={selectedProblem}
          onChange={handleProblemChange}
          className="w-80 p-3 border rounded focus:outline-none"
        >
          <option value="" disabled hidden>
            PROBLEMS
          </option>
          {problemOptions.map((option, index) => (
            <option key={index} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {/* Interactable textbox for "isim" */}
      <div className="text-center mb-4">
        <input
          type="text"
          id="isimInput"
          value={isim}
          onChange={handleIsimChange}
          className="w-80 p-3 border rounded focus:outline-none"
          placeholder="KATILIMCI İSMİ"
        />
      </div>

      {/* Join button */}
      <button
        type="submit"
        className={`bg-[#440807] bg-opacity-95 text-white py-2 px-4 rounded hover:bg-red-950 bg-opacity-95 ${isButtonDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
        onClick={handleJoinClick}
        disabled={isButtonDisabled}
      >
        JOIN
      </button>
    </section>
  );
};

export default Home;
