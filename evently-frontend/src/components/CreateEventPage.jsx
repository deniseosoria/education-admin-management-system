import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import EventForm from "./EventForm";
import { fetchCreateEvent } from "../api";

const CreateEventPage = ({ token }) => {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const handleCreateEvent = async (formData) => {
    try {
      const { event } = await fetchCreateEvent(formData, token);
      setSuccess("Event created successfully!");
      // Optionally navigate to event page or dashboard
      navigate(`/event/${event.id}`);
    } catch (err) {
      console.error(err);
      setError("Failed to create event.");
    }
  };

  if (!token) return <p>Please log in to create an event.</p>;

  return (
    <div className="page-container">
      <h2>Create a New Event</h2>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      <EventForm onSubmit={handleCreateEvent} />
    </div>
  );
};

export default CreateEventPage;
