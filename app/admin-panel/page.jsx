'use client'
import React from 'react';
import {app} from '/firebase/config';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, getDocs, doc, getDoc,arrayUnion } from 'firebase/firestore';
import { db } from '/firebase/config';

const auth = getAuth(app);
import { useRouter } from 'next/navigation';

function AdminPanel() {
    const router = useRouter();
    const [events, setEvents] = useState([]);
    const [newEventName, setNewEventName] = useState('');
    const [newProblemName, setNewProblemName] = useState('');
    const [lastCreatedEvent, setLastCreatedEvent] = useState(null);

    // Function to add a new event
    const addNewEvent = async () => {
        try {
            const eventsCollection = collection(db, 'events');
            const newEventDocRef = await addDoc(eventsCollection, {
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
    const addNewProblem = async () => {
        try {
            if (!lastCreatedEvent) {
                console.error('No recent event available to add a problem to.');
                return;
            }
    
            const eventDocRef = doc(db, 'events', lastCreatedEvent.id);
            await updateDoc(eventDocRef, {
                problems: arrayUnion({
                    name: newProblemName,
                    partipicant: [],
                    poll: [],
                    context: ''
                }),
            });
    
            // Fetch updated events and set them in the state
            const updatedEventsSnapshot = await getDocs(collection(db, 'events'));
            const updatedEventsData = updatedEventsSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setEvents(updatedEventsData);
    
            console.log('New problem added to the last created event.');
        } catch (error) {
            console.error('Error adding new problem:', error);
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
    useEffect(() => {
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
            ÇIKIŞ YAP
        </button>

        <div className="flex justify-center items-start relative mt-3">
            {/* Left Panel */}
            <div className="w-[293px] h-[695px] bg-zinc-300 p-10 mr-10 overflow-y-auto">
            {/* Render events */}
            {events.map((event) => (
                <div key={event.id} className="mb-4">
                <h2 className="text-lg font-bold">{event.name}</h2>

                {/* Render problems inside the event */}
                <div className="ml-4">
                    {event.problems.map((problem) => (
                    <div key={problem.name} className="mb-2">
                        <h3 className="text-md font-semibold">{problem.name}</h3>
                        {/* Display participant names */}
                        <p>
                        <strong>Katılımcılar:</strong>{' '}
                        {problem.partipicant.map((partipicant) => partipicant.name).join(', ')}
                        </p>

                        {/* Display poll array */}
                        <p>
                        <strong>Oylama Sonucu:</strong>{' '}
                        <br />
                        {problem.poll?.map((poll, index) => (
                            <span key={index}>
                            {index > 0 && ' '}
                            {`Öneri : ${poll.idea}, Oy Sayısı: ${poll.vote}`}
                            <br />
                            </span>
                        ))}
                        </p>
                        {/* Display context */}
                        <p>
                        <strong>İçerik:</strong> {problem.context}
                        </p>
                    </div>
                    ))}
                </div>
                </div>
            ))}
            </div>

            {/* Main Content */}
            <div className="flex flex-col justify-between w-[444px] h-[695px] bg-white p-4 mx-10 overflow-y-auto">
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
                        className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 ml-2"
                        onClick={addNewEvent}
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
                                className="border p-2 rounded"
                            />
                            <button
                                className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 ml-2"
                                onClick={addNewProblem}
                            >
                                Add New Problem
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Panel */}
            <div className="flex flex-col justify-between w-[470px] h-[695px] bg-zinc-300 p-4 ml-10 overflow-y-auto">
            {/* Add your content for the right panel here */}
            <div>
                Right Panel
            </div>
            <div className="mt-4">
                {/* Button for Right Panel */}
                <button className="bg-red-950 bg-opacity-95 text-white py-2 px-4 rounded hover:bg-red-950">
                Right Button
                </button>
            </div>
            </div>
        </div>
        </div>
    );
}

export default AdminPanel;
