import React, { useState, useEffect } from "react";
import "../EventForm.css";

const EventForm = ({ onSubmit, initialData = {} }) => {
  const [formData, setFormData] = useState({
    event_name: "",
    description: "",
    event_type: "",
    address: "",
    price: "",
    capacity: "",
    date: "",
    start_time: "",
    end_time: "",
    picture: null,
  });

  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      const formattedData = {
        event_name: initialData.event_name || "",
        description: initialData.description || "",
        event_type: initialData.event_type || "",
        address: initialData.address || "",
        price: initialData.price || "",
        capacity: initialData.capacity || "",
        date: initialData.date ? initialData.date.slice(0, 10) : "",
        start_time: initialData.start_time || "",
        end_time: initialData.end_time || "",
        picture: null,
      };

      setFormData(formattedData);

      if (initialData.picture && initialData.picture.startsWith("http")) {
        setPreviewImage(initialData.picture);
      }
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "picture" && files.length > 0) {
      setFormData((prev) => ({ ...prev, picture: files[0] }));
      setPreviewImage(URL.createObjectURL(files[0]));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();

    const allowedFields = [
      "event_name",
      "description",
      "event_type",
      "address",
      "price",
      "capacity",
      "date",
      "start_time",
      "end_time",
      "picture",
    ];

    allowedFields.forEach((key) => {
      if (formData[key] !== null && formData[key] !== undefined) {
        data.append(key, formData[key]);
      }
    });

    await onSubmit(data);
    setPreviewImage(null);
    setFormData((prev) => ({ ...prev, picture: null }));
  };

  return (
    <form
      className="event-form"
      onSubmit={handleSubmit}
      encType="multipart/form-data"
    >
      <label>
        Event Name:
        <input
          type="text"
          name="event_name"
          value={formData.event_name}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        Description:
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        Category:
        <select
          name="event_type"
          value={formData.event_type}
          onChange={handleChange}
          required
        >
          <option value="">Select Category</option>
          <option value="Music">Music</option>
          <option value="Art">Art</option>
          <option value="Tech">Tech</option>
          <option value="Food">Food</option>
          <option value="Sports">Sports</option>
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
          <option value="Other">Other</option>
        </select>
      </label>

      <label>
        Address:
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        Price ($):
        <input
          type="number"
          name="price"
          step="0.01"
          value={formData.price}
          onChange={handleChange}
        />
      </label>

      <label>
        Capacity:
        <input
          type="number"
          name="capacity"
          value={formData.capacity}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        Date:
        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        Start Time:
        <input
          type="time"
          name="start_time"
          value={formData.start_time}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        End Time:
        <input
          type="time"
          name="end_time"
          value={formData.end_time}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        Upload Image:
        <input
          type="file"
          name="picture"
          accept="image/*"
          onChange={handleChange}
        />
      </label>

      {(previewImage || initialData.picture) && (
        <div className="event-image-preview">
          <img src={previewImage} alt="Event" className="event-image" />
        </div>
      )}

      <button type="submit" className="submit-button">
        Save Event
      </button>
    </form>
  );
};

export default EventForm;
