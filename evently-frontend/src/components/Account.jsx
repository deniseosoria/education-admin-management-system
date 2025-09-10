import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchUserAccount,
  fetchUserEvents,
  fetchUpdateUser,
  fetchCreateEvent,
  fetchUpdateEvent,
  fetchDeleteEvent,
  fetchUserFavorites,
  fetchUserBookings,
  fetchCancelBooking,
  fetchUnfavorite,
} from "../api";
import EventForm from "./EventForm";
import EventCard from "./EventCard";
import "../Account.css";

const Account = ({ token }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userEvents, setUserEvents] = useState([]);
  const [bookedEvents, setBookedEvents] = useState([]);
  const [favoriteEvents, setFavoriteEvents] = useState([]);
  const [newUserEvent, setNewUserEvent] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState("manageEvents");
  const [editingEvent, setEditingEvent] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editUserForm, setEditUserForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", username: "" });

  useEffect(() => {
    // Check if token exists in localStorage
    const storedToken = localStorage.getItem("token");
    if (!storedToken) {
      navigate("/login");
      return;
    }

    async function fetchUserData() {
      try {
        const userData = await fetchUserAccount(storedToken);
        if (!userData) {
          navigate("/login");
          return;
        }
        setUser(userData);
        setFormData({ name: userData.name, username: userData.username });

        if (!userData?.id) return;

        const userEventsData = await fetchUserEvents(userData.id);
        setUserEvents(userEventsData);

        const favorites = await fetchUserFavorites(storedToken);
        setFavoriteEvents(favorites);

        const bookings = await fetchUserBookings(storedToken);
        setBookedEvents(bookings);
      } catch (err) {
        setError("Error fetching account details.");
        navigate("/login");
      }
    }
    fetchUserData();
  }, [navigate]);

  async function handleUserUpdate(e) {
    e.preventDefault();
    try {
      const updateUserData = await fetchUpdateUser(formData, token);
      setUser(updateUserData);
      setSuccess("User updated successfully.");
      setEditUserForm(false);
    } catch (err) {
      setError("Failed to update user.");
    }
  }

  async function handleCreateEvent(formData) {
    try {
      const { event: createEventData } = await fetchCreateEvent(
        formData,
        token
      );

      setUserEvents((prev) => [...prev, createEventData]);
      setNewUserEvent(createEventData);
      setSuccess("Event created successfully.");
      setShowCreateForm(false);
    } catch (err) {
      setError("Failed to create event.");
    }
  }

  const handleEventUpdate = async (eventId, formData) => {
    try {
      const updated = await fetchUpdateEvent(eventId, formData, token);

      setUserEvents((prevEvents) =>
        prevEvents.map((event) => (event.id === eventId ? updated : event))
      );

      setEditingEvent(null); // Hide form
      setSuccess("Event updated successfully.");
    } catch (err) {
      setError("Failed to update event.");
    }
  };

  async function handleRemoveEvent(eventId) {
    try {
      const deleted = await fetchDeleteEvent(eventId, token);
  
      if (deleted?.event || deleted?.success) {
        setUserEvents((prev) => prev.filter((event) => event.id !== eventId));
        setSuccess("Event deleted successfully.");
      } else {
        throw new Error("Delete failed.");
      }
    } catch (err) {
      setError("Failed to delete event.");
    }
  }
  
  
  async function handleCancelBooking(eventId) {
    try {
      await fetchCancelBooking(eventId, token);
      setBookedEvents((prev) => prev.filter((e) => e.id !== eventId));
      setSuccess("Booking canceled.");
    } catch (err) {
      setError("Failed to cancel booking.");
    }
  }

  async function handleRemoveFavorite(eventId) {
    try {
      await fetchUnfavorite(eventId, token);
      setFavoriteEvents((prev) => prev.filter((e) => e.id !== eventId));
      setSuccess("Favorite removed.");
    } catch (err) {
      setError("Failed to remove favorite.");
    }
  }

  function handleSortBookings(option) {
    const sorted = [...bookedEvents].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.start_time}`);
      const dateB = new Date(`${b.date}T${b.start_time}`);
      return option === "past" ? dateB - dateA : dateA - dateB;
    });
    setBookedEvents(sorted);
  }

  const filteredBookedEvents = bookedEvents.filter((event) =>
    event.event_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!token) return <p>Please log in or create an account.</p>;
  if (!user) return <p>Loading account details...</p>;

  return (
    <div className="account-container">
      <div className="sidebar">
        <h3>Account</h3>
        <button
          className={activeTab === "accountInfo" ? "active" : ""}
          onClick={() => setActiveTab("accountInfo")}
        >
          Account Info
        </button>
        <button
          className={activeTab === "manageEvents" ? "active" : ""}
          onClick={() => setActiveTab("manageEvents")}
        >
          Manage Events
        </button>
        <button
          className={activeTab === "bookedEvents" ? "active" : ""}
          onClick={() => setActiveTab("bookedEvents")}
        >
          Booked Events
        </button>
        <button
          className={activeTab === "favoriteEvents" ? "active" : ""}
          onClick={() => setActiveTab("favoriteEvents")}
        >
          Favorite Events
        </button>
      </div>

      <div className="content">
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}

        {/* Account Info */}
        {activeTab === "accountInfo" && (
          <div className="account-info">
            <h2>Welcome, {user.name}!</h2>
            <p>
              <strong>User ID:</strong> {user.id}
            </p>

            {editUserForm ? (
              <form onSubmit={handleUserUpdate}>
                <label>
                  Name:
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  Username:
                  <input
                    type="text"
                    value={formData.username || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    required
                  />
                </label>
                <button type="submit">Save</button>
                <button type="button" onClick={() => setEditUserForm(false)}>
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <p>
                  <strong>Name:</strong> {user.name}
                </p>
                <p>
                  <strong>Username:</strong> {user.username}
                </p>
                <button onClick={() => setEditUserForm(true)}>Edit Info</button>
              </>
            )}
          </div>
        )}

        {/* Manage Events */}
        {activeTab === "manageEvents" && (
          <div className="manage-events">
            <h3>Your Events</h3>
            <button onClick={() => setShowCreateForm(!showCreateForm)}>
              {showCreateForm ? "Cancel" : "Create New Event"}
            </button>

            {showCreateForm && <EventForm onSubmit={handleCreateEvent} />}
            {editingEvent && (
              <EventForm
                key={editingEvent.id}
                initialData={editingEvent}
                onSubmit={(formData) =>
                  handleEventUpdate(editingEvent.id, formData)
                }
              />
            )}

            <div className="event-grid">
              {userEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onView={() => navigate(`/event/${event.id}`, { state: { from: "/users/account" } })}
                  onEdit={setEditingEvent}
                  onDelete={handleRemoveEvent}
                  showEdit
                  showDelete
                />
              ))}
            </div>
          </div>
        )}

        {/* Booked Events */}
        {activeTab === "bookedEvents" && (
          <div className="booked-events">
            <h3>Your Booked Events</h3>
            <input
              type="text"
              placeholder="Search booked events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select onChange={(e) => handleSortBookings(e.target.value)}>
              <option value="upcoming">Upcoming First</option>
              <option value="past">Past First</option>
            </select>

            <div className="event-grid">
              {filteredBookedEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onView={() => navigate(`/event/${event.id}`, { state: { from: "/users/account" } })}
                  onCancelBooking={handleCancelBooking}
                  showCancel
                />
              ))}
            </div>
          </div>
        )}

        {/* Favorite Events */}
        {activeTab === "favoriteEvents" && (
          <div className="favorite-events">
            <h3>Your Favorite Events</h3>

            <div className="event-grid">
              {favoriteEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onView={() => navigate(`/event/${event.id}`, { state: { from: "/users/account" } })}
                  onRemoveFavorite={handleRemoveFavorite}
                  showRemoveFavorite
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Account;
