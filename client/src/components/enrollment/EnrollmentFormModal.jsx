import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Radio,
    RadioGroup,
    FormControlLabel,
    FormControl,
    FormLabel,
    Alert,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Divider
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Policy as PolicyIcon
} from '@mui/icons-material';

const EnrollmentFormModal = ({ open, onClose, onEnroll, sessionId, loading = false }) => {
    const [paymentMethod, setPaymentMethod] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (!paymentMethod) {
            setError('Please select a payment option');
            return;
        }

        setError('');
        onEnroll(sessionId, paymentMethod);
    };

    const handleClose = () => {
        setPaymentMethod('');
        setError('');
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            sx={{
                zIndex: 1450,
                '& .MuiDialog-paper': {
                    borderRadius: '16px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    maxHeight: '90vh'
                }
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827' }}>
                    Enrollment Form
                </Typography>
            </DialogTitle>
            <DialogContent sx={{ pt: 2, maxHeight: '70vh', overflow: 'auto' }}>
                {/* Policies & Procedures Accordion */}
                <Box sx={{ mb: 3 }}>
                    <Accordion defaultExpanded={false} sx={{ boxShadow: 'none', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            sx={{
                                backgroundColor: '#f9fafb',
                                borderRadius: '8px',
                                '&:hover': { backgroundColor: '#f3f4f6' }
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PolicyIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#111827' }}>
                                    Policies & Procedures
                                </Typography>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 2 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                {/* Registration Fee */}
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#111827', mb: 1 }}>
                                        Registration Fee
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#374151', lineHeight: 1.6, fontSize: '0.875rem' }}>
                                        Class must be paid in full before the class start date. Cash, checks, money orders, and EIP award letters are accepted. If using EIP award letter, we must receive the award letter prior to the class start date. Payment plans are available upon request.
                                    </Typography>
                                </Box>

                                <Divider />

                                {/* Financial Aid */}
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#111827', mb: 1 }}>
                                        Financial Aid
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#374151', lineHeight: 1.6, fontSize: '0.875rem', mb: 1 }}>
                                        Scholarship funding to participate in this training may be available through the Educational Incentive Program (EIP). For more information or to apply for a scholarship, please visit{' '}
                                        <a href="https://www.ecetp.pdp.albany.edu" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline' }}>
                                            www.ecetp.pdp.albany.edu
                                        </a>.
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#374151', lineHeight: 1.6, fontSize: '0.875rem' }}>
                                        You may also contact EIP by email at{' '}
                                        <a href="mailto:eip@albany.edu" style={{ color: '#3b82f6', textDecoration: 'underline' }}>
                                            eip@albany.edu
                                        </a>
                                        , or by phone at either (800) 295-9616 or (518) 442-6575. Call us for more information.
                                    </Typography>
                                </Box>

                                <Divider />

                                {/* Refunds */}
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#111827', mb: 1 }}>
                                        Refunds
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#374151', lineHeight: 1.6, fontSize: '0.875rem' }}>
                                        Participants waiting for an EIP award letter must pay for the class and payment will be reimbursed once EIP award letter is received.
                                    </Typography>
                                </Box>

                                <Divider />

                                {/* Cancellation and Credit */}
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#111827', mb: 1 }}>
                                        Cancellation and Credit
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#374151', lineHeight: 1.6, fontSize: '0.875rem' }}>
                                        Cancellations must be made at least 3 days prior to the training session. A credit or refund will be issued for advanced cancellations or if cancellation was made by YJ Child Care Plus, Inc. No credits will be granted to EIP award recipients. In case of any cancellations unused awards must be returned to EIP and you must reapply online for the next available class.
                                    </Typography>
                                </Box>

                                <Divider />

                                {/* Certificates */}
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#111827', mb: 1 }}>
                                        Certificates
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#374151', lineHeight: 1.6, fontSize: '0.875rem' }}>
                                        A certificate will be provided to each attendee after the completion of training and receipt of full payment. Certificates will include the name of the workshop, class date and expiration date, number of training hours completed and the trainer's name and Aspire ID number.
                                    </Typography>
                                </Box>

                                <Divider />

                                {/* Participant's Responsibilities */}
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#111827', mb: 1 }}>
                                        Participant's Responsibilities
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#374151', lineHeight: 1.6, fontSize: '0.875rem' }}>
                                        Participants are responsible for attending all training sessions and to complete all class assignments in order to receive a certificate of completion; responsible for purchasing all required class materials; and responsible for making up any missing sessions.
                                    </Typography>
                                </Box>

                                <Divider />

                                {/* Children */}
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#111827', mb: 1 }}>
                                        Children
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#374151', lineHeight: 1.6, fontSize: '0.875rem' }}>
                                        Child care is not available and children will not be allowed in the training sessions.
                                    </Typography>
                                </Box>

                                <Divider />

                                {/* Non-Discrimination */}
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#111827', mb: 1 }}>
                                        Policy on Non-Discrimination
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#374151', lineHeight: 1.6, fontSize: '0.875rem' }}>
                                        YJ Child Care Plus, Inc does not discriminate on the basis of age, sex, sexual orientation, religion, race, color, nationality, ethnic origin, disability, or veteran or marital status in its participants' access to training, and administration of training policies.
                                    </Typography>
                                </Box>
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>
                        {error}
                    </Alert>
                )}

                <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
                    <FormLabel component="legend" sx={{ mb: 2, fontWeight: 600, color: '#374151' }}>
                        Payment Options
                    </FormLabel>
                    <RadioGroup
                        value={paymentMethod}
                        onChange={(e) => {
                            setPaymentMethod(e.target.value);
                            setError('');
                        }}
                        sx={{ gap: 1 }}
                    >
                        <FormControlLabel
                            value="Self"
                            control={<Radio />}
                            label={
                                <Box>
                                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                        Pay Personally
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                                        I will pay for this class myself
                                    </Typography>
                                </Box>
                            }
                            sx={{
                                border: paymentMethod === 'Self' ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                                borderRadius: '8px',
                                p: 1.5,
                                m: 0,
                                '&:hover': {
                                    backgroundColor: '#f9fafb'
                                }
                            }}
                        />
                        <FormControlLabel
                            value="EIP"
                            control={<Radio />}
                            label={
                                <Box>
                                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                        Apply for Scholarship (EIP)
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                                        I want to apply for scholarship assistance
                                    </Typography>
                                </Box>
                            }
                            sx={{
                                border: paymentMethod === 'EIP' ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                                borderRadius: '8px',
                                p: 1.5,
                                m: 0,
                                '&:hover': {
                                    backgroundColor: '#f9fafb'
                                }
                            }}
                        />
                    </RadioGroup>
                </FormControl>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
                <Button
                    onClick={handleClose}
                    disabled={loading}
                    sx={{
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 500,
                        color: '#6b7280'
                    }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={loading || !paymentMethod}
                    sx={{
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 500,
                        px: 3,
                        backgroundColor: '#3b82f6',
                        '&:hover': {
                            backgroundColor: '#2563eb'
                        }
                    }}
                >
                    {loading ? 'Enrolling...' : 'Enroll Now'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default EnrollmentFormModal;

