'use client'
import React from 'react';
import {app} from '/firebase/config';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, getDocs, doc, getDoc,arrayUnion } from 'firebase/firestore';
import { set, ref, push, update, getDatabase, get, setDoc, onValue } from 'firebase/database';
import { db } from '/firebase/config';
import { v4 as uuidv4 } from 'uuid';

const auth = getAuth(app);
import { useRouter } from 'next/navigation';

function AdminPanel() {
    const router = useRouter();
    const [events, setEvents] = useState([]);
    const [newEventName, setNewEventName] = useState('');
    const [newProblemName, setNewProblemName] = useState('');
    const [lastCreatedEvent, setLastCreatedEvent] = useState(null);
    const [newProblemDescription, setNewProblemDescription] = useState('');
    const [selectedProblemName, setSelectedProblemName] = useState('');
    const [selectedUserName, setSelectedUserName] = useState('');
    const [assignmentSuccess, setAssignmentSuccess] = useState(false);
    const [assignmentError, setAssignmentError] = useState('');
    const [userCounts, setUserCounts] = useState({});
    const [isActiveProblem, setIsActiveProblem] = useState(true);

    // Function to add a new event
    const addNewEvent = async () => {
        try {
            const eventsCollection = collection(db, 'events');
            const newEventDocRef = await addDoc(eventsCollection, {
                isActiveEvent: true,
                name: newEventName,
                problems: [],
            });
    
            // Fetch the newly created event and set it in the state
            const newEventDoc = doc(db, 'events', newEventDocRef.id);
            const newEventSnapshot = await getDoc(newEventDoc);
    
            const newEventData = {
                id: newEventSnapshot.id,
                ...newEventSnapshot.data(),
            };
            setLastCreatedEvent(newEventData);
    
            // Fetch updated events and set them in the state
            const updatedEventsSnapshot = await getDocs(collection(db, 'events'));
            const updatedEventsData = updatedEventsSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setEvents(updatedEventsData);
    
            console.log('New event added:', newEventDocRef.id);
        } catch (error) {
            console.error('Error adding new event:', error);
        }
    };
    // Function to add a new problem to the last created event
    const addNewProblemFS = async (problemId) => {
        try {
            if (!lastCreatedEvent) {
                console.error('No recent event available to add a problem to.');
                return;
            }
            const userId = uuidv4();
    
            // Add the new problem to the current event with teamLeaderId as an empty string and isActive as true
            const eventDocRef = doc(db, 'events', lastCreatedEvent.id);
            // Fetch existing participants

            // Add the new participant
            const newParticipant = {
                id: userId,
                name: "GPT",
                pages: [],
            };

            // Update the document with the new participant
            await updateDoc(eventDocRef, {
                problems: arrayUnion({
                    id: problemId,
                    name: newProblemName,
                    partipicant: [newParticipant],
                    poll: [],
                    context: newProblemDescription,
                    teamLeaderId: '',
                    isActive: true,
                    count: 0,
                }),
            });

            console.log('New problem added to the last created event (Firestore).');
        } catch (error) {
            console.error('Error adding new problem (Firestore):', error);
        }
    };
     
    const addNewProblemRD = async (problemId) => {
        try {
          // Get a reference to the Firebase Realtime Database
          const db = getDatabase();
      
          // Reference to the new problem node under the root
          const newProblemRef = ref(db, problemId);
      
          // Data for the new problem
          const newProblemData = {
            isCountdownActive: false,
            isVoteActive: false,
            isActive: true,
            eventID: lastCreatedEvent.id,
            teamLeaderId: '',
            userCount: 1, //default chat gpt
            id: problemId,
            name: newProblemName,
            count: 0,
          };      
      
          // Set the data for the new problem under the specified problemId
          await set(newProblemRef, newProblemData);
      
          // Fetch updated problems and set them in the state
          const updatedProblemsSnapshot = await get(ref(db));
          const updatedProblemsData = [];
      
          updatedProblemsSnapshot.forEach((childSnapshot) => {
            const problemData = {
              id: childSnapshot.key,
              ...childSnapshot.val(),
            };
      
            updatedProblemsData.push(problemData);
          });
    
          // Reset input values
          setNewProblemName('');
          setNewProblemDescription('');
      
          console.log('New problem added to the Realtime Database.');
        } catch (error) {
          console.error('Error adding new problem (Realtime Database):', error);
        }
    };
       
    const handleAddNewProblem = () => {
        const newProblemId = uuidv4();
        addNewProblemFS(newProblemId);
        addNewProblemRD(newProblemId);
    };        

    const handleAssignTeamLeader = async () => {
        try {
          // Validate that 'selectedProblemName' and 'selectedUserName' are not empty
          if (!selectedProblemName || !selectedUserName) {
            console.error('Invalid input: selectedProblemName and selectedUserName are required.');
            return;
          }
      
          // Find the chosen problem by name
          const chosenProblemIndex = events.findIndex((event) =>
            event.problems.some((problem) => problem.name === selectedProblemName)
          );
      
          if (chosenProblemIndex !== -1) {
            // Chosen problem exists, check if participants array exists
            const chosenProblem = events[chosenProblemIndex].problems.find((problem) => problem.name === selectedProblemName);
      
            if (chosenProblem) {
              // Find the chosen user by name
              const chosenUser = chosenProblem.partipicant.find((participant) => participant.name === selectedUserName);
      
              if (chosenUser) {
                // Update the teamLeaderId property inside the specified problem with the id of the chosen user
                chosenProblem.teamLeaderId = chosenUser.id;

                const rb = getDatabase();

                // Reference to the new problem node under the root
                const newProblemRef = ref(rb, chosenProblem.id);

                // Update only the teamLeaderId property of the existing chosenProblem
                update(newProblemRef, {
                ['teamLeaderId']: chosenUser.id,
                });
                    
                // Update Firestore with the new team leader
                const eventsCollection = collection(db, 'events');
                const eventsSnapshot = await getDocs(eventsCollection);
      
                eventsSnapshot.forEach(async (doc) => {
                  const eventData = doc.data();
                  const eventProblems = eventData.problems || [];
      
                  // Update the chosen problem inside the problems array
                  const updatedProblems = eventProblems.map((problem) =>
                    problem.name === selectedProblemName ? chosenProblem : problem
                  );
      
                  // Update Firestore with the new team leader
                  await updateDoc(doc.ref, { problems: updatedProblems });
                });
            
                // Set the success message
                setAssignmentSuccess(true);

                // Clear the success message after a few seconds
                setTimeout(() => {
                    setAssignmentSuccess(false);
                    setAssignmentError('');
                }, 1000);
              }else{
                setAssignmentError('User not found in the selected problem.');
                setTimeout(() => {
                    setAssignmentError('');
                }, 1000);
            }
            }
          }else {
            alert('Problem not found.');
        }
        } catch (error) {
          console.error('Error updating Firestore:', error);
          alert('An error occurred while updating Firestore.');
        }
    };
      

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (!user) {
            // If the user is not signed in, redirect to the login page
            router.push('/');
          }
        });
    
        // Clean up the subscription when the component is unmounted
        return () => unsubscribe();
    }, [router]);

    // Fetch events and set them in the state
    const fetchEvents = async () => {
          try {
            const eventsCollection = collection(db, 'events');
            const eventsSnapshot = await getDocs(eventsCollection);
      
            const eventsData = eventsSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setEvents(eventsData);
          } catch (error) {
            console.error('Error fetching events:', error);
          }
    };

    useEffect(() => {
        fetchEvents();
    }, []);
      
 
    const handleUserCountsChange = (snapshot) => { 
        const data = snapshot.val();
        // Ensure data exists
        if (data !== null) {
          // Iterate through each problem and update userCounts
          const newUserCounts = {};
          Object.keys(data).forEach((problemKey) => {
            const userCount = data[problemKey]?.userCount;
            if (userCount !== undefined) {
              newUserCounts[problemKey] = userCount;
            }
          });
      
          // Only trigger when any userCount changes
          if (Object.keys(newUserCounts).length > 0 && JSON.stringify(newUserCounts) !== JSON.stringify(userCounts)) {
            console.log('User counts changed:', newUserCounts);
            setUserCounts(newUserCounts);
            setTimeout(() => {
                fetchEvents();
              }, 100);
          }
        }
    };
      
    useEffect(() => {
        const rb = getDatabase();
        // Point the reference to the root
        const rootRef = ref(rb); 
        const unsubscribe = onValue(rootRef, handleUserCountsChange);
        return () => {
          // Cleanup the listener when the component unmounts
          unsubscribe();
        };
    }, [userCounts]);


    const handleIsEventActive = (snapshot) => {
        const data = snapshot.val();
        // Ensure data exists and has the necessary properties
        Object.keys(data).forEach((problemKey) => {
            const eventId = data[problemKey]?.eventID;
            const isActive = data[problemKey]?.isActive;

            if (isActive !== isActiveProblem) {
                // Call the eventId event from the Firestore database

                console.log(`Event ${eventId} isActive changed to ${isActive}`);

                const docRef = doc(db, 'events', eventId);
                const eventSnapshot = getDoc(docRef);
            
                if (eventSnapshot.exists()) {
                    const problems = eventSnapshot.data().problems;
                    let pCount = problems.length;

                    eventSnapshot.data().problems.forEach((item) => {
                        if (item.isActive) {
                            return; // Exit the current function
                        }
                        pCount--;
                        if (pCount === 0) {
                            // Update the isActiveEvent property of the existing event
                            updateDoc(docRef, {
                                ['isActiveEvent']: false,
                            });
                        }
                    });
                }
            }
        });
    }

    useEffect(() => {
        const rb = getDatabase();
        // Point the reference to the root
        const rootRef = ref(rb); 
        const unsubscribe = onValue(rootRef, handleIsEventActive);
        return () => {
          // Cleanup the listener when the component unmounts
          unsubscribe();
        };
    }, [isActiveProblem]);

    
    useEffect(() => {
        fetchEvents();
    }, []);
         

    const handleSignOut = async () => {
        try {
            await auth.signOut();
            // You can add additional actions after signing out if needed
            console.log('User signed out');
            router.push('/');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    return (
        <div>
        {/* Sign Out Button */}
        <button className="bg-red-950 bg-opacity-95 text-white hover:bg-red-950 btn relative btn-neutral flex h-9 w-20 items-center justify-center whitespace-nowrap rounded-lg border border-token-border-medium focus:ring-0"
            type="button" onClick={handleSignOut}>
            Sign Out
        </button>

        <div className="flex justify-center items-start relative mt-3">
            {/* Left Panel */}
            <div className="w-[293px] bg-zinc-300 p-4 mr-10 relative overflow-hidden" style={{height: "calc(100vh - 60px)"}}>
            <div className="flex justify-center items-center">
                <h2 className="text-lg font-bold text-red-950 absolute w-full bg-zinc-300 text-center">Events</h2>
            </div>
            {/* Render events */}
            <div className="h-full overflow-y-auto mt-5 pb-10">
            {events.map((event) => (
                <div key={event.id} className="mb-4">
                <h2 className="text-md font-semibold text-red-950">{event.name}</h2>

                {/* Render problems inside the event */}
                <div className="ml-4">
                    {Array.isArray(event.problems) && event.problems?.map((problem) => (
                    <div key={problem.name} className="mb-2">
                        <h3 className="text-md ">{problem.name}</h3>
                        {/* Display participant names */}
                        <p>
                        <strong>Participants:</strong>{' '}
                        {problem.partipicant?.map((partipicant) => partipicant.name).join(', ')}
                        </p>
                        {/* Display context */}
                        <p>
                        <strong>Context:</strong> {problem.context}
                        </p>
                        {/* Display poll array */}
                        <p>
                        <strong>Poll Results:</strong>{' '}
                        <br />
                        {problem.poll?.map((poll, index) => (
                            <span key={index}>
                                {index > 0 && ' '}
                                <span>
                                <strong>{'Idea: '}</strong>
                                {poll.name}
                                <br />
                                <strong>{'Votes: '}</strong>
                                {poll.vote}
                                </span>
                                <br />
                                <br />
                            </span>
                        ))}
                        </p>
                    </div>
                    ))}
                </div>
                </div>
            ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-col justify-between w-[444px] bg-white p-4 mx-10 " style={{height: "calc(100vh - 60px)"}}>
                {/* Button to add a new event */}
                <div className="mt-4">
                    <input
                        type="text"
                        placeholder="Enter new event name"
                        value={newEventName}
                        onChange={(e) => setNewEventName(e.target.value)}
                        className="border p-2 rounded"
                    />
                    <button
                        className="bg-red-950 bg-opacity-95 text-white py-2 px-4 rounded hover:bg-red-950 ml-2"
                        onClick={addNewEvent}
                        disabled={!newEventName.trim()} // Disable if the input is empty or contains only whitespace
                    >
                        Add New Event
                    </button>
                </div>

                {/* Render the newly created event and its "Add Problem" button */}
                {lastCreatedEvent && (
                    <div key={lastCreatedEvent.id} className="mt-4">
                        <h2 className="text-lg font-bold">{lastCreatedEvent.name}</h2>

                        {/* Button to add a new problem to the current event */}
                        <div className="mt-2">
                            <input
                                type="text"
                                placeholder="Enter new problem name"
                                value={newProblemName}
                                onChange={(e) => setNewProblemName(e.target.value)}
                                className="border p-2 rounded mr-2"
                            />
                            <input
                                type="text"
                                placeholder="Enter problem description"
                                value={newProblemDescription}
                                onChange={(e) => setNewProblemDescription(e.target.value)}
                                className="border p-2 rounded mr-2"
                            />
                            <button
                                className="bg-red-950 bg-opacity-95 text-white py-2 px-4 rounded hover:bg-red-950 "
                                onClick={handleAddNewProblem}
                                disabled={!newProblemName.trim() || !newProblemDescription.trim()}
                            >
                                Add New Problem
                            </button>
                        </div>

                    </div>
                )}
            </div>

            {/* Right Panel */}
            <div className="flex flex-col justify-between w-[470px] bg-zinc-300 p-4 ml-10 relative overflow-y-auto" style={{height: "calc(100vh - 60px)"}}>
                <div>
                    <div className="flex justify-center items-center">
                        <h2 className="text-lg font-bold text-red-950 absolute w-full bg-zinc-300 text-center">Active Problems</h2>
                    </div>
                    <div className='h-[600px] overflow-y-auto mt-5 pb-10'>
                    {/* Display active problems and their participant lists */}
                    {events.map((event) => (
                        <div key={event.id} className="mb-4">
                            {event.isActiveEvent && <h3 className="text-md font-semibold text-red-950">{event.name}</h3>}
                            <div className="ml-4">
                                {Array.isArray(event.problems) && event.problems?.filter((problem) => problem.isActive)
                                    .map((activeProblem) => (
                                        <div key={activeProblem.name} className="mb-2">
                                            <p>
                                                <strong>Problem Name:</strong> {activeProblem.name}
                                            </p>
                                            {/* Display participant names */}
                                            <p>
                                                <strong>Participants:</strong>{' '}
                                                {activeProblem.partipicant?.map((participant) => participant.name).join(', ')}
                                            </p>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))}
                    </div>
                </div>
                <div className="mt-4 absolute bottom-0">
                    {/* Button for Right Panel */}
                    <div>
                        <input
                            type="text"
                            placeholder="Enter problem name"
                            value={selectedProblemName}
                            onChange={(e) => setSelectedProblemName(e.target.value)}
                            className="border p-2 rounded"
                        />
                        <input
                            type="text"
                            placeholder="Enter user name"
                            value={selectedUserName}
                            onChange={(e) => setSelectedUserName(e.target.value)}
                            className="border p-2 rounded"
                        />
                        <button
                            className={`bg-red-950 bg-opacity-95 text-white py-2 px-4 rounded hover:bg-red-950`}
                            onClick={handleAssignTeamLeader}
                            disabled={!selectedProblemName.trim() || !selectedUserName.trim()}
                        >
                            Assign Team Leader
                        </button>
                        {/* Success message */}
                        {assignmentSuccess && (
                            <p className="text-red-500 font-sans-serif">Team leader assigned successfully!</p>
                        )}
                        {assignmentError && (
                            <p className="text-red-500 font-sans-serif">
                            {assignmentError}
                            </p>
                        )}
                        </div>
                </div>
            </div>
        </div>
        </div>
    );
}

export default AdminPanel;
