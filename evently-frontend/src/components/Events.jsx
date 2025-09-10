import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchEvents, fetchEventReviews } from "../api/index";
import "../Events.css";

const Events = ({ token }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortOption, setSortOption] = useState("date");
  const [reviewsMap, setReviewsMap] = useState({});

  useEffect(() => {
    async function getData() {
      try {
        const eventsData = await fetchEvents();
        setEvents(eventsData);

        const allReviews = await Promise.all(
          eventsData.map((event) => fetchEventReviews(event.id))
        );

        const mappedReviews = {};
        eventsData.forEach((event, index) => {
          const reviews = allReviews[index];
          const avg =
            reviews.length > 0
              ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
              : null;
          mappedReviews[event.id] = {
            count: reviews.length,
            average: avg ? avg.toFixed(1) : null,
          };
        });
        setReviewsMap(mappedReviews);
      } catch (err) {
        setError(
          err.message || "Failed to load events. Please try again later."
        );
      } finally {
        setIsLoading(false);
      }
    }

    getData();
  }, []);

  const formatEventDate = (dateString, timeString) => {
    if (!dateString || !timeString) return "Unknown Date & Time";
    const eventDate = new Date(dateString);
    if (isNaN(eventDate)) return "Invalid Date";
    const formattedDate = eventDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    const [hours, minutes] = timeString.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes)) return formattedDate;
    const hours12 = hours % 12 || 12;
    const amPm = hours >= 12 ? "PM" : "AM";
    return `${formattedDate} ${hours12}:${minutes
      .toString()
      .padStart(2, "0")} ${amPm}`;
  };

  const filteredEvents = events
    .filter((event) =>
      event.event_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter((event) =>
      cityFilter
        ? event.address.toLowerCase().includes(cityFilter.toLowerCase())
        : true
    )
    .filter((event) =>
      categoryFilter ? event.event_type === categoryFilter : true
    )
    .sort((a, b) => {
      if (sortOption === "date") {
        return new Date(a.date) - new Date(b.date);
      } else if (sortOption === "price-asc") {
        return a.price - b.price;
      } else if (sortOption === "price-desc") {
        return b.price - a.price;
      }
      return 0;
    });

  if (isLoading) return <h2 className="loading">Loading events...</h2>;
  if (error) {
    return (
      <div className="error">
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="events-page">
      <h2 className="page-title">Events</h2>

      <div className="filters">
        <input
          type="text"
          placeholder="Search events..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <input
          type="text"
          placeholder="Filter by city"
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
        />

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="Music">Music</option>
          <option value="Conference">Conference</option>
          <option value="Festival">Festival</option>
          <option value="Networking">Networking</option>
          <option value="Wellness">Wellness</option>
          <option value="Education">Education</option>
          <option value="Entertainment">Entertainment</option>
          <option value="Business">Business</option>
          <option value="Fashion">Fashion</option>
          <option value="Travel">Travel</option>
          <option value="Charity">Charity</option>
          <option value="Food & Drink">Food & Drink</option>
          <option value="Art">Art</option>
          <option value="Tech">Tech</option>
          <option value="Sports">Sports</option>
          <option value="Other">Other</option>
        </select>

        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
        >
          <option value="date">Sort by Date</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>
      </div>

      {filteredEvents.length === 0 ? (
        <p className="no-events">No matching events found.</p>
      ) : (
        <div className="events-grid">
          {filteredEvents.map((event) => (
            <div
              className="event-card"
              key={event.id}
              onClick={() => navigate(`/event/${event.id}`, { state: { token } })}
            >
              <img
                src={
                  event.picture?.startsWith("http")
                    ? event.picture
                    : "https://placehold.co/150x220/zzz/000?text=NoImage"
                }
                onError={(e) =>
                  (e.currentTarget.src =
                    "https://placehold.co/150x220/zzz/000?text=NoImage")
                }
                alt={event.event_name || "Event Image"}
              />

              <div className="event-info">
                <h3>{event.event_name || "Unknown Event"}</h3>
                <p>{formatEventDate(event.date, event.start_time)}</p>
                <p>
                  {event.price !== null && event.price !== undefined
                    ? event.price === 0
                      ? "Free"
                      : `$${event.price}`
                    : "Price Unavailable"}
                </p>
                {reviewsMap[event.id]?.average && (
                  <p>
                    ⭐ {reviewsMap[event.id].average} (
                    {reviewsMap[event.id].count} review
                    {reviewsMap[event.id].count !== 1 ? "s" : ""})
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Events;