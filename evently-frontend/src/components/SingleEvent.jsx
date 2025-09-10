import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import {
  fetchEventById,
  fetchEventReviews,
  fetchFavorite,
  fetchUnfavorite,
  fetchBook,
  fetchCancelBooking,
  fetchUserFavorites,
  fetchUserBookings,
  fetchCreateReview,
} from "../api";
import "../SingleEvent.css";

const SingleEvent = ({ token }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [referrer, setReferrer] = useState(null);
  const [event, setEvent] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isBooked, setIsBooked] = useState(false);
  const [review, setReview] = useState("");
  const [rating, setRating] = useState(5);

  useEffect(() => {
    if (location.state?.from) {
      setReferrer(location.state.from);
    }
  }, [location]);

  useEffect(() => {
    async function fetchData() {
      try {
        const eventData = await fetchEventById(id);
        setEvent(eventData);

        const reviewsData = await fetchEventReviews(id);
        setReviews(reviewsData);

        if (token) {
          const userFavorites = await fetchUserFavorites(token);
          const userBookings = await fetchUserBookings(token);

          const matchedFavorite = userFavorites.find(
            (fav) => String(fav.id) === String(eventData.id)
          );
          // setIsFavorited(!!matchedFavorite);
          setIsFavorited(
            userFavorites.some(
              (favorite) => favorite.event_name === eventData.event_name
            )
          );

          setIsBooked(
            userBookings.some(
              (booking) => booking.event_name === eventData.event_name
            )
          );
        }
      } catch (err) {
        setError(err.message || "Failed to load event data.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [id, token]);

  const formatEventDate = (dateString, timeString) => {
    if (!dateString || !timeString) return "Date/time unavailable";

    const eventDate = new Date(dateString);
    const [hours, minutes] = timeString.split(":").map(Number);
    const hours12 = hours % 12 || 12;
    const amPm = hours >= 12 ? "PM" : "AM";
    const formattedTime = `${hours12}:${minutes
      .toString()
      .padStart(2, "0")} ${amPm}`;
    const formattedDate = eventDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    return `${formattedDate} ${formattedTime}`;
  };

  const toggleFavorite = async () => {
    try {
      if (!event || !token) return;

      if (isFavorited) {
        await fetchUnfavorite(event.id, token);
        setIsFavorited(false);
      } else {
        await fetchFavorite(event.id, token);
        setIsFavorited(true);
      }
    } catch (err) {
      setError("Failed to update favorite.");
    }
  };

  const toggleBooking = async () => {
    try {
      if (!event || !token) return;

      if (isBooked) {
        await fetchCancelBooking(event.id, token);
        setIsBooked(false);
      } else {
        const bookRes = await fetchBook(event.id, token);
        if (bookRes.error) throw new Error(bookRes.error);
        setIsBooked(true);
      }
    } catch (err) {
      setError("Failed to update booking.");
    }
  };

  const submitReview = async () => {
    try {
      await fetchCreateReview(event.id, rating, review, token);
      const updatedReviews = await fetchEventReviews(id);
      setReviews(updatedReviews);
      setReview("");
      setSuccess("Review submitted!");
    } catch (err) {
      setError("Failed to submit review.");
    }
  };

  if (isLoading) return <h2>Loading event details...</h2>;

  if (error) {
    return (
      <div className="single-event">
        <h2>Error</h2>
        <p>{error}</p>
        <Link to="/">Back to All Events</Link>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="single-event">
        <h2>Event not found.</h2>
        <Link to="/">Back to All Events</Link>
      </div>
    );
  }

  const averageRating = reviews?.length
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(
        1
      )
    : null;

  const imageUrl = event.picture?.startsWith("http")
    ? event.picture
    : "https://placehold.co/150x220/zzz/000?text=NoImage";

  return (
    <div className="single-event">
      <button onClick={() => navigate(referrer || -1)} className="back-button">
        ←{" "}
        {referrer === "/users/account"
          ? "Back to Account"
          : referrer === "/"
          ? "Back to All Events"
          : "Back"}
      </button>

      <h1>{event.event_name || "Unknown Name"}</h1>
      {averageRating && <h3>Average Rating: {averageRating}⭐</h3>}
      <h3>{formatEventDate(event.date, event.start_time)}</h3>

      <img
        src={imageUrl}
        alt={event.event_name || "Event Image"}
        onError={(e) =>
          (e.currentTarget.src =
            "https://placehold.co/150x220/zzz/000?text=Image+Unavailable")
        }
      />

      <h4>
        {event.price === 0
          ? "Free"
          : event.price
          ? `$${event.price}`
          : "Price Unavailable"}
      </h4>

      <p>{event.description || "No description available."}</p>

      {!token && (
        <p style={{ marginTop: "1rem", color: "#555" }}>
          Please <Link to="/users/login">log in</Link> to favorite, book, or
          leave a review.
        </p>
      )}

      {token && (
        <div className="event-actions">
          <button onClick={toggleFavorite}>
            {isFavorited ? "★ Unfavorite" : "☆ Favorite"}
          </button>
          <button onClick={toggleBooking}>
            {isBooked ? "Cancel Booking" : "Book Now"}
          </button>
        </div>
      )}

      {token && (
        <div>
          <h3>Leave a Review</h3>
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5].map((r) => (
              <option key={r} value={r}>
                {r} Star
              </option>
            ))}
          </select>
          <textarea
            placeholder="Write your review..."
            value={review}
            onChange={(e) => setReview(e.target.value)}
          />
          <button onClick={submitReview}>Submit Review</button>
        </div>
      )}

      <h2>Reviews</h2>
      {reviews.length > 0 ? (
        <ul className="review-list">
          {reviews.map((review) => (
            <li key={review.id}>
              <strong>{review.rating}⭐</strong>: {review.text_review}
            </li>
          ))}
        </ul>
      ) : (
        <p>No reviews yet.</p>
      )}

      {success && <p style={{ color: "green" }}>{success}</p>}
    </div>
  );
};

export default SingleEvent;
