import { useEffect, useState } from "react";
import { fetchUserFavorites, fetchUnfavorite } from "../api"; 
import { Link } from "react-router-dom";

const FavoriteEvents = ({ token }) => {
  const [favorites, setFavorites] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadFavorites() {
      try {
        const data = await fetchUserFavorites(token);
        if (!data.error) {
          setFavorites(data);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError("Failed to fetch favorite events.");
      }
    }

    loadFavorites();
  }, [token]);

  const handleUnfavorite = async (eventId) => {
    try {
      await fetchUnfavorite(eventId, token);
      setFavorites((prev) => prev.filter((event) => event.id !== eventId));
    } catch (err) {
      setError("Failed to unfavorite event.");
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
      <h2>Your Favorite Events</h2>
      {error && <p className="error">{error}</p>}
      {favorites.length > 0 ? (
        <ul className="event-list">
          {favorites.map((event) => (
            <li key={event.id}>
              <h4>{event.event_name}</h4>
              <p>{formatEventDate(event.date, event.start_time)}</p>
              <Link to={`/event/${event.id}`}>
                <button>View Event</button>
              </Link>
              <button onClick={() => handleUnfavorite(event.id)}>
                Unfavorite
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>You haven't favorited any events yet.</p>
      )}
    </div>
  );
};

export default FavoriteEvents;

