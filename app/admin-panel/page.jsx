'use client'
import React from 'react';
import {app} from '/firebase/config';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, getDocs, doc, getDoc, arrayUnion, where, query } from 'firebase/firestore';
import { set, ref, push, update, getDatabase, get, setDoc, onValue, onChildChanged } from 'firebase/database';
import { db } from '/firebase/config';
import { v4 as uuidv4 } from 'uuid';

const auth = getAuth(app);
import { useRouter } from 'next/navigation';

function AdminPanel() {
    const router = useRouter();
    const [events, setEvents] = useState([]);
    const [newEventName, setNewEventName] = useState('');
    const [newProblemName, setNewProblemName] = useState('');
    const [selectedEvent, setSelectedEvent] = useState('');
    const [selectedEventDropdown, setSelectedEventDropdown] = useState('');
    const [lastCreatedEvent, setLastCreatedEvent] = useState(null);
    const [newProblemDescription, setNewProblemDescription] = useState('');
    const [selectedProblemId, setSelectedProblemId] = useState('');
    const [selectedUserId, setSelectedUserId] = useState('');
    const [assignmentSuccess, setAssignmentSuccess] = useState(false);
    const [assignmentError, setAssignmentError] = useState('');
    const [userCounts, setUserCounts] = useState({});
    const [activeEvents, setActiveEvents] = useState([]);
    const [activeProblems, setActiveProblems] = useState([]);
    const [activeUsers, setActiveUsers] = useState([]);

    const fetchActiveEvents = async () => {
        try {
          // Fetch all events
          const eventsQuery = query(collection(db, 'events'));
          const eventsSnapshot = await getDocs(eventsQuery);
          const allEvents = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
          // Filter active events
          const activeEvents = allEvents.filter(event => event.isActiveEvent);

          setActiveEvents(activeEvents);
        } catch (error) {
          console.error('Error fetching events:', error);
        }
    };

    const fetchActiveProblems = async (selectedEventDropdown) => {
        try {
            setSelectedEventDropdown(selectedEventDropdown);
            if(selectedEventDropdown){    
                const newEventDoc = doc(db, 'events', selectedEventDropdown); 
                const newEventSnapshot = await getDoc(newEventDoc);
                const eventData = newEventSnapshot.data();
                const eventProblems = eventData.problems || [];
                const newProblemsArray = [];
                const newUsersArray = [];

                eventProblems.forEach((item) => {
                    if (item.isActive) {
                        newProblemsArray.push(item);
                    }
                });

                setActiveProblems(newProblemsArray);
                setActiveUsers(newUsersArray);
            }
        } catch (error) {
          console.error('Error fetching events:', error);
        }
    };

    const fetchActiveUsers = async (selectedProblemId) => {
        try {
            setSelectedProblemId(selectedProblemId);
            if(selectedEventDropdown){    
                const newEventDoc = doc(db, 'events', selectedEventDropdown); 
                const newEventSnapshot = await getDoc(newEventDoc);
                const eventData = newEventSnapshot.data();
                const eventProblems = eventData.problems || [];

                eventProblems.forEach((item) => {
                    if (item.id == selectedProblemId){
                        const problemUsers = item.partipicant || [];
                        setActiveUsers(problemUsers);
                        return;
                    }
                });  
            }
        } catch (error) {
          console.error('Error fetching events:', error);
        }
    };

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

            setTimeout(() => {
                fetchActiveEvents();
            }, 1000);
    
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
          // Validate that 'selectedProblemId' and 'selectedUserId' are not empty
          if (!selectedProblemId || !selectedUserId) {
            console.error('Invalid input: selectedProblemId and selectedUserId are required.');
            return;
          }
      
          // Find the chosen problem
          const chosenProblemIndex = events.findIndex((event) =>
            event.problems.some((problem) => problem.id === selectedProblemId)
          );
      
          if (chosenProblemIndex !== -1) {
            // Chosen problem exists, check if participants array exists
            const chosenProblem = events[chosenProblemIndex].problems.find((problem) => problem.id === selectedProblemId);
      
            if (chosenProblem) {
                // Find the chosen user by name
                const chosenUser = chosenProblem.partipicant.find((participant) => participant.id === selectedUserId);
                if(chosenUser.name == "GPT"){
                    setAssignmentError('GPT cannot be assigned as team leader.');
                    setTimeout(() => {
                        setAssignmentError('');
                    }, 1000);
                    return;
                }
                if (chosenUser) {
                    // Update the teamLeaderId property inside the specified problem with the id of the chosen user
                    chosenProblem.teamLeaderId = selectedUserId;

                    const rb = getDatabase();
                    // Reference to the new problem node under the root
                    const newProblemRef = ref(rb, selectedProblemId);
                    const newProblemSnapshot = await get(newProblemRef);
                    let FsEventId = newProblemSnapshot.val().eventID;

                    // Update only the teamLeaderId property of the existing chosenProblem
                    update(newProblemRef, {
                        ['teamLeaderId']: selectedUserId,
                    });
                        
                    const eventsCollection = doc(db, 'events', FsEventId);
                    const eventsSnapshot = await getDoc(eventsCollection);

                    if (eventsSnapshot.exists()) {
                        const eventData = eventsSnapshot.data();
                        const eventProblems = eventData.problems || [];

                        // Update the chosen problem inside the problems array
                        const updatedProblems = eventProblems.map((problem) =>
                            problem.name === selectedProblemId ? chosenProblem : problem
                        );

                        // Update Firestore with the new team leader
                        await updateDoc(eventsCollection, { problems: updatedProblems });
                    } else {
                        console.log('Event not found');
                    }
        
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
        fetchActiveEvents();
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


    const handleIsEventActive = async (snapshot) => {
        const data = snapshot.val();

        // Ensure data exists and has the necessary properties
        const eventId = data.eventID;
        const isActive = data.isActive;

        if (!isActive) {

            setTimeout(async () => {
                // Retrieve the current event data
                const eventRef = doc(db, 'events', eventId);
                const eventDoc = await getDoc(eventRef);

                if (!eventDoc.exists()) {
                    console.log('Event not found');
                    return;
                }
                
                if (eventDoc.exists()) {
                    const problems =  eventDoc.data().problems;
                    let pCount = 0;
                    console.log("problems.length: " + problems.length);
                    
                    problems.forEach((item) => { 
                        console.log("item: " + JSON.stringify(item));  
                        if (item.isActive) {
                            console.log("Problem " + item.name + " is active");
                            return; // Exit the current function
                        }
                        else pCount++;       
                    });

                    console.log("pCount: " + pCount);
                    if (pCount == problems.length) {
                        // Update the isActiveEvent property of the existing event
                        updateDoc(eventRef, {
                            ['isActiveEvent']: false,
                        });

                        setTimeout(() => {
                            fetchEvents();
                            fetchActiveEvents();
                          }, 1000);

                    } 
                    pCount = 0;  
                }
            }, 1000);
        }
    }

    useEffect(() => {
        const rb = getDatabase();
        // Point the reference to the root
        const rootRef = ref(rb); 
        const unsubscribe = onChildChanged(rootRef, (snapshot) => {
            setTimeout(() => {
                // Handle the change
                fetchEvents();
                handleIsEventActive(snapshot);
            }, 500);
        });
        return () => {
          // Cleanup the listener when the component unmounts
          unsubscribe();
        };
    }, []);

    
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

    const handleSelectedEventChange = (event) => {
        setSelectedEvent(event.target.value);
    };

    const handleSelectedEventDropdownChange = (event) => {
        setSelectedEventDropdown(event.target.value);
        setSelectedProblemId('');
        setTimeout(() => {fetchActiveProblems(event.target.value);}, 300);
    };

    const handleSelectedProblemChange = (problem) => {
        setSelectedProblemId(problem.target.value);
        setSelectedUserId('');
        setTimeout(() => {fetchActiveUsers(problem.target.value);}, 300);
    };

    const handleSelectedUserChange = (user) => {
        setSelectedUserId(user.target.value);
    };

    const handleSelectedEvent = async () => {
        const newEventDoc = doc(db, 'events', selectedEvent); 
        const newEventSnapshot = await getDoc(newEventDoc);

        const chosenEvent = {
            id: newEventSnapshot.id,
            ...newEventSnapshot.data(),
        };
        setLastCreatedEvent(chosenEvent);
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
                <h2 className="text-md font-bold text-red-950">{event.name}</h2>

                {/* Render problems inside the event */}
                <div className="ml-4">
                    {Array.isArray(event.problems) && event.problems?.map((problem) => (
                    <div key={problem.name} className="mb-2">
                        <h3 className="text-md font-semibold text-red-950 ">{problem.name}</h3>
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
                <div className="flex justify-center items-center">
                    <select className='border rounded py-2 px-4' id="eventDropdown"
                        value={selectedEvent}
                        onChange={handleSelectedEventChange}
                    >
                        <option value="" disabled hidden>
                            Active Events
                        </option>
                        {activeEvents.map(event => (
                        <option key={event.id} value={event.id}>
                            {event.name}
                        </option>
                        ))}
                    </select>
                    <button
                        className="bg-red-950 bg-opacity-95 text-white py-2 px-4 rounded hover:bg-red-950 ml-2"
                        disabled={!selectedEvent.trim()}
                        onClick={handleSelectedEvent}
                    >
                        Select Event
                    </button>
                </div>

                {/* Button to add a new event */}
                <div className="flex justify-center items-center">
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
                        <select className='border rounded py-2 px-4' id="eventDropdown"
                            value={selectedEventDropdown}
                            onChange={handleSelectedEventDropdownChange}
                        >
                            <option value="" disabled hidden>
                                Active Events
                            </option>
                            {activeEvents.map(event => (
                            <option key={event.id} value={event.id}>
                                {event.name}
                            </option>
                            ))}
                        </select>
                        <select className='border rounded py-2 px-2' id="eventDropdown"
                            disabled={activeProblems.length == 0 || activeEvents.length == 0}
                            value={selectedProblemId}
                            onChange={handleSelectedProblemChange}
                        >
                            <option value="" disabled hidden>
                                Active Problems
                            </option>
                            {activeProblems.map(problem => (
                            <option key={problem.id} value={problem.id}>
                                {problem.name}
                            </option>
                            ))}
                        </select>
                        <select className='border rounded py-2 px-4' id="eventDropdown"
                            disabled={activeUsers.length == 0 || activeProblems.length == 0}
                            value={selectedUserId}
                            onChange={handleSelectedUserChange}
                        >
                            <option value="" disabled hidden>
                                Active Users
                            </option>
                            {activeUsers.map(user => (
                            <option key={user.id} value={user.id}>
                                {user.name}
                            </option>
                            ))}
                        </select>
                        
                        </div>
                        <button
                            className={`bg-red-950 bg-opacity-95 text-white py-2 px-4 rounded hover:bg-red-950`}
                            onClick={handleAssignTeamLeader}
                            disabled={!selectedProblemId.trim() || !selectedUserId.trim()}
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
    );
}

export default AdminPanel;
