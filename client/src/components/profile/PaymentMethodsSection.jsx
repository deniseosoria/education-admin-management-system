import React, { useState } from 'react';
import './PaymentMethodsSection.css';

const PaymentMethodsSection = ({ paymentMethods, onPaymentMethodsUpdate }) => {
    const [isAddingNew, setIsAddingNew] = useState(false);

    // Ensure paymentMethods is always an array
    const safePaymentMethods = paymentMethods || [];

    const handleAddNew = () => {
        setIsAddingNew(true);
        // In a real app, this would open a payment form or modal
        // For now, we'll just simulate adding a new payment method
        setTimeout(() => {
            const newMethod = {
                id: Date.now(),
                payment_type: 'credit_card',
                last_four: '4242',
                expiry_date: '2025-12-31',
                is_default: false
            };
            onPaymentMethodsUpdate([...safePaymentMethods, newMethod]);
            setIsAddingNew(false);
        }, 1000);
    };

    const handleSetDefault = (methodId) => {
        const updatedMethods = paymentMethods.map(method => ({
            ...method,
            is_default: method.id === methodId
        }));
        onPaymentMethodsUpdate(updatedMethods);
    };

    const handleDelete = (methodId) => {
        const updatedMethods = paymentMethods.filter(method => method.id !== methodId);
        onPaymentMethodsUpdate(updatedMethods);
    };

    return (
        <div className="payment-methods-section">
            <div className="section-header">
                <h2>Payment Methods</h2>
                <button
                    className="btn btn-primary"
                    onClick={handleAddNew}
                    disabled={isAddingNew}
                >
                    <i className="fas fa-plus"></i>
                    Add Payment Method
                </button>
            </div>

            {safePaymentMethods.length > 0 ? (
                <div className="payment-methods-list">
                    {safePaymentMethods.map(method => (
                        <div key={method.id} className="payment-method-card">
                            <div className="payment-method-icon">
                                <i className="fas fa-credit-card"></i>
                            </div>
                            <div className="payment-method-info">
                                <div className="payment-method-type">
                                    {method.payment_type === 'credit_card' ? 'Credit Card' : method.payment_type}
                                </div>
                                <div className="payment-method-details">
                                    •••• {method.last_four} | Expires {new Date(method.expiry_date).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="payment-method-actions">
                                {!method.is_default && (
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => handleSetDefault(method.id)}
                                    >
                                        Set as Default
                                    </button>
                                )}
                                {method.is_default && (
                                    <span className="default-badge">
                                        <i className="fas fa-check"></i> Default
                                    </span>
                                )}
                                <button
                                    className="btn btn-danger"
                                    onClick={() => handleDelete(method.id)}
                                >
                                    <i className="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <i className="fas fa-credit-card"></i>
                    <p>No payment methods added</p>
                    <p className="empty-state-subtext">
                        Add a payment method to enroll in classes
                    </p>
                </div>
            )}
        </div>
    );
};

export default PaymentMethodsSection; 