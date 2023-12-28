'use client' 
// Import necessary dependencies and components
import React from 'react';
import { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, getDocs, doc, getDoc,arrayUnion } from 'firebase/firestore';
import { set, ref, push, update, getDatabase, get, setDoc, onValue } from 'firebase/database';
import { useRouter } from 'next/navigation';
import { db } from '/firebase/config';
import { useFormik } from 'formik';
import * as Yup from 'yup';

// Main function component
function tlEditor() {
  // State variables
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [displayText, setDisplayText] = useState('');
  const [problemData, setProblemData] = useState(null);
  const [userId, setUserId] = useState('');
  const [selectedProblem, setSelectedProblem] = useState('');
  const [eventId, setEventId] = useState('');

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

  // Formik initialization for poll creation
  const formik = useFormik({
    initialValues: {
      question: '',
      options: [],
      newOption: '',
      selectedOptions: [],
    },
    validationSchema: Yup.object({
      newOption: Yup.string().required('Required'),
    }),
    onSubmit: (values) => {
      // If newOption is not empty, add it to the options list
      if (values.newOption.trim()) {
        const updatedOptions = [...values.options, values.newOption];
        formik.setFieldValue('options', updatedOptions);
        formik.setFieldValue('newOption', '');
        formik.setFieldTouched('newOption', false, false);
      }
    },
  });

  const handleSavePoll = async (options) => {
    try {
      if (!eventId || !selectedProblem) {
        console.error('Event ID or selected problem not found.');
        return;
      }
  
      const docRef = doc(db, 'events', eventId);
      const eventSnapshot = await getDoc(docRef);
  
      if (!eventSnapshot.exists()) {
        console.error('Event not found in Firestore.');
        return;
      }
  
      const eventData = eventSnapshot.data();
      const updatedProblems = eventData.problems.map((item) => {
        if (item.id === selectedProblem) {
          // Modify the poll array locally
          const updatedPoll = options.map((option) => ({ name: option, vote: 0 }));
          return {
            ...item,
            poll: updatedPoll,
          };
        }
        return item;
      });
  
      // Update the entire document with the modified problems array
      await updateDoc(docRef, {
        problems: updatedProblems,
      });
  
      console.log('Poll options saved successfully.');
    } catch (error) {
      console.error('Error saving poll options:', error);
    }
  };
  
  const handleVotePage = async () => {
    if(selectedProblem){
      const rb = getDatabase();
      const problemRef = ref(rb, selectedProblem);
      update(problemRef, { isVoteActive: true});
      router.push('/vote-page');
    }
  }

  const handleDisplayText = async (Count) => {
    try {
      const participantData = problemData.partipicant;
  
          if (participantData.length > 0) {
            const displayText = participantData.map((participant, participantIndex) => {
              const pagesData = participant.pages || [];
  
              const participantText = pagesData.map((page, index) => (
                <li key={index}>
                  <strong>Name:</strong> {page.name} <br />
                  <strong>Text:</strong> {page.textVal}
                </li>
              ));
  
              return (
                <div key={participantIndex}>
                  <h3>{`Participant ${participantIndex + 1}`}</h3>
                  <ul>{participantText}</ul>
                </div>
              );
            });
  
            // Update your state or UI as needed
            setDisplayText(<div>{displayText}</div>);
            setInputText('');
          }
    } catch (error) {
      console.error('Error retrieving data from Firestore:', error);
    }
  };
  
  useEffect(() => {
    handleDisplayText();
  }, [problemData]);
  
  // JSX structure
  return (
    <div className='relative z-0 flex h-full w-full overflow-auto'>
      {/* Sidebar */}
      <div className="flex flex-col items-center justify-start h-screen p-4 bg-red-950 bg-opacity-95">
        {/* Spacer to push buttons to the middle */}
        <div className="flex-grow"></div>
        {/* Button 3 */}
        <button className="mb-5 p-2 w-[160px] h-[80px] bg-red-900 text-white rounded hover:bg-red-600"
          onClick={() => handleVotePage()}
        >
          Start Poll
        </button>
        {/* Spacer to push buttons to the middle */}
        <div className="flex-grow"></div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center h-screen w-full">
        {/* Display problem data */}
        {problemData && (
          <>
            <h3 className="text-md text-red-950 font-bold mb-2">{"Problem Name: " + problemData.name}</h3>
            <p>{"Context: " + problemData.context}</p>
          </>
        )}

        {/* Two parts side by side */}
        <div className="flex w-full mt-4" style={{ height: "calc(100vh - 60px)" }}>

          {/* Part 1: Display lists of ideas in editable texts */}
          <div className="flex flex-col justify-between w-[444px] bg-white p-4 mx-10 overflow-y-auto" >
            {/* Textbox in the bottom middle */}
            {/* Display and edit additional text */}
            <div contentEditable={true} className="border p-2 rounded resize-none h-full w-full mb-2">
              {displayText}
            </div>
          </div>

          {/* Part 2: Create multi-choice poll using Formik */}
          <div className="flex flex-col justify-between w-[50%] bg-white p-4 mx-2 overflow-y-auto">
            <form onSubmit={formik.handleSubmit}>
              <div className="flex absolute bg-white">
                  <h3 className="flex text-md text-red-950 w-full bg-white font-bold">Enter Poll Values</h3>       
              </div>   

              {/* List of options */}
              <div className="flex flex-col mt-7 pb-15 gap-2 overflow-y-auto">
                {formik.values.options.map((option, index) => (
                  <div key={index} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formik.values.selectedOptions.includes(option)}
                      className="mr-2"
                    />
                    <span>{option}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 absolute bg-white bottom-0">
                {/* Textbox for adding a new option */}
                <input
                  type="text"
                  placeholder="Add new option"
                  name="newOption"
                  value={formik.values.newOption}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="border p-2 rounded resize-none w-full mb-2"
                />
                {formik.touched.newOption && formik.errors.newOption ? (
                  <div className="text-red-500">{formik.errors.newOption}</div>
                ) : null}

                {/* Button to add a new option */}
                <button
                  type="button"
                  onClick={formik.handleSubmit}
                  className="bg-red-950 bg-opacity-95 text-white py-1 px-4 rounded hover:bg-red-950"
                  disabled={!formik.values.newOption.trim() || formik.errors.newOption}
                >
                  Add Option
                </button>

                {/* Button to update display text (save the poll) */}
                <button
                  type="button"
                  onClick={() => handleSavePoll(formik.values.options)}
                  className="bg-red-950 bg-opacity-95 text-white py-1 px-4 rounded hover:bg-red-950"
                  disabled={formik.values.options.length === 0}
                >
                  Save Poll
                </button>
              </div>          
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export the component
export default tlEditor;
