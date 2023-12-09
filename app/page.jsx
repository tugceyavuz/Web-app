'use client'
import { useState, useEffect } from 'react';
import { db } from '@/firebase/config';
import { collection, getDocs  } from 'firebase/firestore';
import { updateDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

const Home = () => {
  const router = useRouter();
  const [selectedProblem, setSelectedProblem] = useState('');
  const [isim, setIsim] = useState('');
  const [problemOptions, setProblemOptions] = useState([]);
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);

  useEffect(() => {
    //get the list of problems from firestore
    const fetchProblems = async () => {
      try {
        const eventsCollection = collection(db, 'events');
        const eventsSnapshot = await getDocs(eventsCollection);

        const problems = [];

        eventsSnapshot.forEach((doc) => {
          const eventData = doc.data();
          const eventProblems = eventData.problems || [];

          // Iterate through each problem in the array
          eventProblems.forEach((problem) => {
            // Assuming each problem has a 'name' property
            const problemName = problem.name;
            
            // Add the problem name to the problems array
            problems.push(problemName);
          });
        });

        // Set the problems array as the options
        setProblemOptions(problems);
      } catch (error) {
        console.error('Error fetching problems:', error);
      }
    };

    fetchProblems();
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
  
          // Create participants array if it doesn't exist
          if (!chosenProblem.hasOwnProperty('partipicant')) {
            chosenProblem.partipicant = [];
          }
  
          // Get the existing problems array
          const updatedProblems = [...eventProblems];
  
          // Update the participants array inside the specified problem
          updatedProblems[chosenProblemIndex] = {
            ...chosenProblem,
            partipicant: [...chosenProblem.partipicant, { id: userId, name: isim }],
          };
  
          // Update Firestore with the new participant
          updateDoc(doc.ref, { problems: updatedProblems });
  
          // Redirect the user to the meeting page
          router.push('/meeting-page');
        }
      });
    } catch (error) {
      console.error('Error updating Firestore:', error);
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
            PROBLEMLER
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
        KATIL
      </button>
    </section>
  );
};

export default Home;
