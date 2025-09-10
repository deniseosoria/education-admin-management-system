import { useEffect, useState } from "react";
import { fetchUserBookings, fetchCancelBooking } from "../api"; 
import { Link } from "react-router-dom";

const BookedEvents = ({ token }) => {
  const [bookedEvents, setBookedEvents] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadBookings() {
      try {
        const bookings = await fetchUserBookings(token);
        if (!bookings.error) {
          setBookedEvents(bookings);
        } else {
          setError(bookings.error);
        }
      } catch (err) {
        setError("Failed to fetch booked events.");
      }
    }

    loadBookings();
  }, [token]);

  const handleCancelBooking = async (eventId) => {
    try {
      await fetchCancelBooking(eventId, token);
      setBookedEvents((prev) => prev.filter((event) => event.id !== eventId));
    } catch (err) {
      setError("Failed to cancel booking.");
    }
  };

  const formatEventDate = (dateString, timeString) => {
    const eventDate = new Date(dateString);
    const [hours, minutes] = timeString.split(":").map(Number);
    const ampm = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${eventDate.toLocaleDateString("en-US")} ${hour12}:${String(
      minutes
    ).padStart(2, "0")} ${ampm}`;
  };

  return (
    <div className="page-container">
      <h2>Your Booked Events</h2>
      {error && <p className="error">{error}</p>}
      {bookedEvents.length > 0 ? (
        <ul className="event-list">
          {bookedEvents.map((event) => (
            <li key={event.id}>
              <h4>{event.event_name}</h4>
              <p>{formatEventDate(event.date, event.start_time)}</p>
              <Link to={`/event/${event.id}`}>
                <button>View Event</button>
              </Link>
              <button onClick={() => handleCancelBooking(event.id)}>
                Cancel Booking
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>You haven't booked any events yet.</p>
      )}
    </div>
  );
};

export default BookedEvents;

