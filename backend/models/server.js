//OLD
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import session from 'express-session';
import { registerResponder, loginResponder, authenticate } from './controllers/responderController.js';
import Reported from './models/Reported.js';
import Notification from './models/Notification.js';
import CompletedReport from './models/CompletedReport.js';
import User from './models/Users.js';
import Responder from './models/Responder.js';
import OngoingReport from './models/OngoingReport.js';
import CancelledReport from './models/CancelledReport.js';
import Schedule from './models/Schedule.js';
import Donation from './models/Donation.js';
import Message from './models/Chat.js';

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Session configuration
app.use(
  session({
    secret: 'your-secret-key', // Use a secure, long, random key in production
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 60 * 60 * 1000 }, // 1-hour session
  })
);

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection failed:', err));

// Routes
app.post('/api/register', registerResponder);
app.post('/api/login', loginResponder);

// Protected route example
app.get('/api/admin', authenticate, (req, res) => {
  res.status(200).json({ message: 'Welcome to the admin page!' });
});


// Route to get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find(); // Fetch all users
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});


// Toggle user status
app.put('/api/users/:id/status', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.status = user.status === 'active' ? 'deactivated' : 'active';
    await user.save();

    res.json({ message: `User status changed to ${user.status}`, updatedUser: user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Route to get all responders
app.get('/api/responders', async (req, res) => {
  try {
    const responders = await Responder.find();
    res.json(responders);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching responders' });
  }
});



// Fetch all donations
app.get('/api/donations', async (req, res) => {
  try {
    const donations = await Donation.find(); // Fetch all donations from MongoDB
    res.json(donations); // Send the donations as a JSON response
  } catch (error) {
    console.error('Error fetching donations:', error);
    res.status(500).json({ error: 'Error fetching donations' });
  }
});

// Fetch all schedules
app.get('/api/schedules', async (req, res) => {
  try {
    const schedules = await Schedule.find(); // Fetch all schedules from MongoDB
    res.json(schedules); // Send the schedules as a JSON response
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: 'Error fetching schedules' });
  }
});

// Update schedule status
app.put('/api/schedules/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate the status
    const validStatuses = ["pending", "confirmed", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Find and update the schedule
    const updatedSchedule = await Schedule.findByIdAndUpdate(
      id,
      { status },
      { new: true } // Return the updated document
    );

    if (!updatedSchedule) {
      return res.status(404).json({ error: "Schedule not found" });
    }

    res.json(updatedSchedule); // Return the updated schedule
  } catch (error) {
    console.error("Error updating schedule status:", error);
    res.status(500).json({ error: "Error updating schedule status" });
  }
});
app.get('/api/responder', async (req, res) => {
  try {
    const responders = await Responder.find();
    const responderCounts = responders.reduce((counts, responder) => {
      counts[responder.responderType] = (counts[responder.responderType] || 0) + 1;
      return counts;
    }, {});

    res.json(responderCounts);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching responders' });
  }
});

// Update responder status route
app.put('/api/responders/:id/toggle-status', async (req, res) => {
  try {
    const responder = await Responder.findById(req.params.id);
    if (!responder) {
      return res.status(404).json({ message: 'Responder not found' });
    }

    // Toggle isActive status
    responder.isActive = !responder.isActive;
    await responder.save();

    res.json({ message: `Responder status updated to ${responder.isActive ? 'active' : 'deactivated'}`, responder });
  } catch (error) {
    res.status(500).json({ error: 'Error updating responder status' });
  }
});

app.get('/api/deactivated-users-responders', async (req, res) => {
  try {
    const deactivatedUsers = await User.find({ status: 'deactivated' }); // Users with status = 'deactivated'
    const deactivatedResponders = await Responder.find({ isActive: false }); // Responders with isActive = false
    
    res.status(200).json([...deactivatedUsers, ...deactivatedResponders]); // Merge both arrays
  } catch (error) {
    console.error('Error fetching deactivated users/responders:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Fetch reports assigned to the barangay
app.get('/api/barangay-reports', async (req, res) => {
  try {
    const barangayReports = await Reported.find({ responderType: "Barangay" }); // Filter only Barangay reports
    res.json(barangayReports);
  } catch (error) {
    console.error("Error fetching Barangay reports:", error);
    res.status(500).json({ success: false, message: "Server error while fetching reports." });
  }
});

//BARANGAY NOTIFICATION
app.get('/api/notifications/:userName', async (req, res) => {
  try {
    const { userName } = req.params;
    const notifications = await Notification.find({ userName }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ success: false, message: "Error fetching notifications." });
  }
});


// Delete a report by ID BARANGAY
app.delete('/api/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedReport = await Reported.findByIdAndDelete(id);

    if (!deletedReport) {
      return res.status(404).json({ success: false, message: "Report not found." });
    }

    res.json({ success: true, message: "Report deleted successfully!" });
  } catch (error) {
    console.error("Error deleting report:", error);
    res.status(500).json({ success: false, message: "Server error while deleting report." });
  }
});


// ✅ Fetch Barangay Profile by Email
app.get("/api/barangay-settings", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const barangay = await Responder.findOne({ email, responderType: "barangay" });
    if (!barangay) {
      return res.status(404).json({ message: "Barangay profile not found." });
    }

    res.json(barangay);
  } catch (error) {
    console.error("Error fetching barangay profile:", error);
    res.status(500).json({ message: "Server error while fetching barangay profile." });
  }
});

// ✅ Fetch NGO Profile by Email
app.get("/api/ngo-settings", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    // Assuming "Responder" is the model for both Barangay and NGO
    const ngo = await Responder.findOne({ email, responderType: "ngo" });
    if (!ngo) {
      return res.status(404).json({ message: "NGO profile not found." });
    }

    res.json(ngo);
  } catch (error) {
    console.error("Error fetching NGO profile:", error);
    res.status(500).json({ message: "Server error while fetching NGO profile." });
  }
});

// ✅ Update Report Status and Move to the Correct Collection 
app.put("/api/reports/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Find the report
    const report = await Reported.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found." });
    }

    console.log("Fetched report:", report);

    const userName = report.reportedBy;
    if (!userName) {
      console.error("Error: ReportedBy is missing for report ID:", report._id);
      return res.status(400).json({ success: false, message: "ReportedBy field is missing for this report." });
    }

    if (status === "Completed") {
      // ✅ Move report to CompletedReports
      const completedReport = new CompletedReport({
        ...report.toObject(),
        dateCompleted: new Date(),
      });

      await completedReport.save();
      await Reported.findByIdAndDelete(id);
      console.log(`Report ID: ${id} moved to CompletedReports.`);
    } 
    else if (status === "Ongoing") {
      // ✅ Move to OngoingReports (if not already moved)
      const existingOngoingReport = await OngoingReport.findOne({ _id: id });

      if (!existingOngoingReport) {
        const ongoingReport = new OngoingReport({
          ...report.toObject(),
          dateOngoing: new Date(),
          status: "Ongoing",
        });

        await ongoingReport.save();
        await Reported.findByIdAndDelete(id);
        console.log(`Report ID: ${id} moved to OngoingReports.`);
      }
    } 
    else if (status === "Cancelled") {
      // ✅ Move report to CancelledReports
      const cancelledReport = new CancelledReport({
        ...report.toObject(),
        dateCancelled: new Date(),
        status: "Cancelled",
      });

      await cancelledReport.save();
      await Reported.findByIdAndDelete(id);
      console.log(`Report ID: ${id} moved to CancelledReports.`);
    } 
    else {
      // Just update status
      report.status = status;
      report.statusUpdatedAt = new Date();
      await report.save();
    }

    // ✅ Create a notification
    const notification = new Notification({
      userName,
      reportId: report._id,
      message: `Your report has been updated to "${status}".`,
      type: report.type, // Use the incident type from the report
    });

    await notification.save();
    console.log("Notification saved:", notification);

    res.json({ success: true, message: "Status updated successfully!", report });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ success: false, message: "Server error while updating status." });
  }
});


// ✅ Update Ongoing Report Status (to Completed or Cancelled)
app.put("/api/ongoing-reports/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Find the ongoing report
    const ongoingReport = await OngoingReport.findById(id);
    if (!ongoingReport) {
      return res.status(404).json({ success: false, message: "Ongoing report not found." });
    }

    console.log("Fetched ongoing report:", ongoingReport);

    const userName = ongoingReport.reportedBy;
    if (!userName) {
      console.error("Error: ReportedBy is missing for ongoing report ID:", ongoingReport._id);
      return res.status(400).json({ success: false, message: "ReportedBy field is missing for this report." });
    }

    if (status === "Completed") {
      // ✅ Move report to CompletedReports
      const completedReport = new CompletedReport({
        ...ongoingReport.toObject(),
        dateCompleted: new Date(),
      });

      await completedReport.save();
      await OngoingReport.findByIdAndDelete(id);
      console.log(`Ongoing Report ID: ${id} moved to CompletedReports.`);
    } 
    else if (status === "Cancelled") {
      // ✅ Move report to CancelledReports
      const cancelledReport = new CancelledReport({
        ...ongoingReport.toObject(),
        dateCancelled: new Date(),
      });

      await cancelledReport.save();
      await OngoingReport.findByIdAndDelete(id);
      console.log(`Ongoing Report ID: ${id} moved to CancelledReports.`);
    } 
    else {
      // Invalid status
      return res.status(400).json({ success: false, message: "Invalid status. Only 'Completed' or 'Cancelled' are allowed." });
    }

    // ✅ Create a notification
    const notification = new Notification({
      userName,
      reportId: ongoingReport._id,
      message: `Your report has been updated to "${status}".`,
      type: ongoingReport.type, // Use the incident type from the report
    });

    await notification.save();
    console.log("Notification saved:", notification);

    res.json({ success: true, message: `Status updated to "${status}" successfully!` });
  } catch (error) {
    console.error("Error updating ongoing report status:", error);
    res.status(500).json({ success: false, message: "Server error while updating status." });
  }
});

// DELETE Completed Report BARANGAY
app.delete("/api/completed-reports/:id", async (req, res) => {
  try {
    const report = await CompletedReport.findByIdAndDelete(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }
    res.json({ success: true, message: "Report deleted successfully" });
  } catch (error) {
    console.error("Error deleting report:", error);
    res.status(500).json({ success: false, message: "Server error while deleting report." });
  }
});


// ✅ Fetch All Completed Reports with responderType "Barangay"
app.get("/api/completed-reports", async (req, res) => {
  try {
    const completedReports = await CompletedReport.find({ responderType: "Barangay" });
    res.json(completedReports);
  } catch (error) {
    console.error("Error fetching completed reports:", error);
    res.status(500).json({ success: false, message: "Server error while fetching completed reports." });
  }
});
// ✅ Fetch All Ongoing Reports BARANGAY
app.get("/api/ongoing-reports", async (req, res) => {
  try {
    const ongoingReports = await OngoingReport.find();
    res.json(ongoingReports);
  } catch (error) {
    console.error("Error fetching ongoing reports:", error);
    res.status(500).json({ success: false, message: "Server error while fetching ongoing reports." });
  }
});
// Fetch All Cancelled Reports with responderType "Barangay"
app.get("/api/cancelled-reports", async (req, res) => {
  try {
    const cancelledReports = await CancelledReport.find({ responderType: "Barangay" });
    res.json(cancelledReports);
  } catch (error) {
    console.error("Error fetching cancelled reports:", error);
    res.status(500).json({ success: false, message: "Server error while fetching cancelled reports." });
  }
});


// Fetch reports assigned to the NGO
app.get('/api/ngo-reports', async (req, res) => {
  try {
    const ngoReports = await Reported.find({ responderType: "NGO" }); // Filter only NGO reports
    res.json(ngoReports);
  } catch (error) {
    console.error("Error fetching NGO reports:", error);
    res.status(500).json({ success: false, message: "Server error while fetching reports." });
  }
});

app.get('/api/maritime-reports', async (req, res) => {
  try {
    const maritimeReports = await Reported.find({ responderType: "PNP Maritime" }); // Filter only PNP Maritime reports
    res.json(maritimeReports);
  } catch (error) {
    console.error("Error fetching PNP Maritime reports:", error);
    res.status(500).json({ success: false, message: "Server error while fetching reports." });
  }
});
// Fetch all ongoing reports
app.get("/api/ongoing-reports", async (req, res) => {
  try {
    const ongoingReports = await OngoingReport.find();
    res.json(ongoingReports);
  } catch (error) {
    console.error("Error fetching ongoing reports:", error);
    res.status(500).json({ success: false, message: "Server error while fetching ongoing reports." });
  }
});

// ✅ Fetch All Completed Reports with optional responderType filter
app.get("/api/completed-reports", async (req, res) => {
  try {
    const { responderType } = req.query;
    const filter = responderType ? { responderType } : {}; // If responderType is provided, filter by it
    const completedReports = await CompletedReport.find(filter);
    res.json(completedReports);
  } catch (error) {
    console.error("Error fetching completed reports:", error);
    res.status(500).json({ success: false, message: "Server error while fetching completed reports." });
  }
});

app.get('/api/pcg-reports', async (req, res) => {
  try {
    const pcgReports = await Reported.find({ responderType: "PCG" }); // Filter only PCG reports
    res.json(pcgReports);
  } catch (error) {
    console.error("Error fetching PCG reports:", error);
    res.status(500).json({ success: false, message: "Server error while fetching reports." });
  }
});

// ✅ Fetch PCG Profile by Email
app.get("/api/pcg-settings", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const pcg = await Responder.findOne({ email, responderType: "pcg" });
    if (!pcg) {
      return res.status(404).json({ message: "PCG profile not found." });
    }

    res.json(pcg);
  } catch (error) {
    console.error("Error fetching PCG profile:", error);
    res.status(500).json({ message: "Server error while fetching PCG profile." });
  }
});

// ✅ Update PCG Profile
app.put("/api/pcg-settings", async (req, res) => {
  try {
    const { email, name, address, contactNumber } = req.body;
    const pcg = await Responder.findOneAndUpdate(
      { email, responderType: "pcg" },
      { name, address, contactNumber },
      { new: true }
    );

    if (!pcg) {
      return res.status(404).json({ message: "PCG profile not found." });
    }

    res.json({ success: true, message: "Profile updated successfully!", pcg });
  } catch (error) {
    console.error("Error updating PCG profile:", error);
    res.status(500).json({ message: "Server error while updating PCG profile." });
  }
});

// ✅ Update PCG Password
app.put("/api/pcg-settings/password", async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    const pcg = await Responder.findOne({ email, responderType: "pcg" });

    if (!pcg) {
      return res.status(404).json({ message: "PCG profile not found." });
    }

    // Check if the current password matches
    if (pcg.password !== currentPassword) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    // Update the password
    pcg.password = newPassword;
    await pcg.save();

    res.json({ success: true, message: "Password updated successfully!" });
  } catch (error) {
    console.error("Error updating PCG password:", error);
    res.status(500).json({ message: "Server error while updating PCG password." });
  }
});


app.get('/api/bfar-reports', async (req, res) => {
  try {
    const bfarReports = await Reported.find({ responderType: "BFAR" }); // Filter only BFAR reports
    res.json(bfarReports);
  } catch (error) {
    console.error("Error fetching BFAR reports:", error);
    res.status(500).json({ success: false, message: "Server error while fetching reports." });
  }
});


// ✅ Fetch BFAR Profile by Email
app.get("/api/bfar-settings", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const bfar = await Responder.findOne({ email, responderType: "bfar" });
    if (!bfar) {
      return res.status(404).json({ message: "BFAR profile not found." });
    }

    res.json(bfar);
  } catch (error) {
    console.error("Error fetching BFAR profile:", error);
    res.status(500).json({ message: "Server error while fetching BFAR profile." });
  }
});

// ✅ Update BFAR Profile
app.put("/api/bfar-settings", async (req, res) => {
  try {
    const { email, name, address, contactNumber } = req.body;
    const bfar = await Responder.findOneAndUpdate(
      { email, responderType: "bfar" },
      { name, address, contactNumber },
      { new: true }
    );

    if (!bfar) {
      return res.status(404).json({ message: "BFAR profile not found." });
    }

    res.json({ success: true, message: "Profile updated successfully!", bfar });
  } catch (error) {
    console.error("Error updating BFAR profile:", error);
    res.status(500).json({ message: "Server error while updating BFAR profile." });
  }
});

// ✅ Update BFAR Password
app.put("/api/bfar-settings/password", async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    const bfar = await Responder.findOne({ email, responderType: "bfar" });

    if (!bfar) {
      return res.status(404).json({ message: "BFAR profile not found." });
    }

    // Check if the current password matches
    if (bfar.password !== currentPassword) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    // Update the password
    bfar.password = newPassword;
    await bfar.save();

    res.json({ success: true, message: "Password updated successfully!" });
  } catch (error) {
    console.error("Error updating BFAR password:", error);
    res.status(500).json({ message: "Server error while updating BFAR password." });
  }
});


// In server.js, update or add this route
// Add this to your Express server file

// Get all admin messages
app.get('/api/admin-groupchat', async (req, res) => {
  try {
    const adminMessages = await Message.find({ responderType: "Admin" })
      .sort({ timestamp: 1 });

    res.json({
      groupName: "USERS GROUPCHAT",
      messages: adminMessages
    });
  } catch (error) {
    console.error('Error fetching admin group chat:', error);
    res.status(500).json({ 
      error: 'Failed to fetch admin group chat',
      details: error.message 
    });
  }
});

// Send new admin message
app.post('/api/send-admin-message', async (req, res) => {
  try {
    const { messageText, senderName = 'Admin' } = req.body;

    if (!messageText) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const newMessage = new Message({
      text: messageText,
      sender: senderName,
      responderType: 'Admin',
      timestamp: new Date(),
      isRead: false,
      reportId: 'GROUP_CHAT' // Special ID for group chat messages
    });

    const savedMessage = await newMessage.save();

    // Emit the new message to all connected clients via WebSocket if you have one
    // io.emit('new_admin_message', savedMessage);

    res.status(201).json({ 
      message: 'Message sent successfully', 
      newMessage: savedMessage 
    });

  } catch (error) {
    console.error('Error sending admin message:', error);
    res.status(500).json({ 
      error: 'Failed to send admin message',
      details: error.message 
    });
  }
});

// Get all barangay messages
app.get('/api/barangay-groupchat', async (req, res) => {
  try {
    const barangayMessages = await Message.find({ responderType: "Barangay" })
      .sort({ timestamp: 1 });

    res.json({
      groupName: "USERS GROUPCHAT",
      messages: barangayMessages
    });
  } catch (error) {
    console.error('Error fetching barangay group chat:', error);
    res.status(500).json({ 
      error: 'Failed to fetch barangay group chat',
      details: error.message 
    });
  }
});

// Send new barangay message
app.post('/api/send-barangay-message', async (req, res) => {
  try {
    const { messageText, senderName = 'Barangay' } = req.body;

    if (!messageText) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const newMessage = new Message({
      text: messageText,
      sender: senderName,
      responderType: 'Barangay',
      timestamp: new Date(),
      isRead: false,
      reportId: 'GROUP_CHAT' // Special ID for group chat messages
    });

    const savedMessage = await newMessage.save();

    // Emit the new message to all connected clients via WebSocket if you have one
    // io.emit('new_barangay_message', savedMessage);

    res.status(201).json({ 
      message: 'Message sent successfully', 
      newMessage: savedMessage 
    });

  } catch (error) {
    console.error('Error sending barangay message:', error);
    res.status(500).json({ 
      error: 'Failed to send barangay message',
      details: error.message 
    });
  }
});

// Get all BFAR messages
app.get('/api/bfar-groupchat', async (req, res) => {
  try {
    const bfarMessages = await Message.find({ responderType: "BFAR" })
      .sort({ timestamp: 1 });
    res.json({
      groupName: "USERS GROUPCHAT",
      messages: bfarMessages
    });
  } catch (error) {
    console.error('Error fetching BFAR group chat:', error);
    res.status(500).json({ 
      error: 'Failed to fetch BFAR group chat',
      details: error.message 
    });
  }
});

// Send new BFAR message
app.post('/api/send-bfar-message', async (req, res) => {
  try {
    const { messageText, senderName = 'BFAR' } = req.body;
    if (!messageText) {
      return res.status(400).json({ error: 'Message text is required' });
    }
    const newMessage = new Message({
      text: messageText,
      sender: senderName,
      responderType: 'BFAR',
      timestamp: new Date(),
      isRead: false,
      reportId: 'GROUP_CHAT' // Special ID for group chat messages
    });
    const savedMessage = await newMessage.save();
    // Emit the new message to all connected clients via WebSocket if you have one
    // io.emit('new_bfar_message', savedMessage);
    res.status(201).json({ 
      message: 'Message sent successfully', 
      newMessage: savedMessage 
    });
  } catch (error) {
    console.error('Error sending BFAR message:', error);
    res.status(500).json({ 
      error: 'Failed to send BFAR message',
      details: error.message 
    });
  }
});

// Get all maritime messages
app.get('/api/maritime-groupchat', async (req, res) => {
  try {
    const maritimeMessages = await Message.find({ responderType: "PNP Maritime" })
      .sort({ timestamp: 1 });
    res.json({
      groupName: "USERS GROUPCHAT",
      messages: maritimeMessages
    });
  } catch (error) {
    console.error('Error fetching maritime group chat:', error);
    res.status(500).json({ 
      error: 'Failed to fetch maritime group chat',
      details: error.message 
    });
  }
});

// Send new maritime message
app.post('/api/send-maritime-message', async (req, res) => {
  try {
    const { messageText, senderName = 'PNP Maritime' } = req.body;
    if (!messageText) {
      return res.status(400).json({ error: 'Message text is required' });
    }
    const newMessage = new Message({
      text: messageText,
      sender: senderName,
      responderType: 'PNP Maritime',
      timestamp: new Date(),
      isRead: false,
      reportId: 'GROUP_CHAT' // Special ID for group chat messages
    });
    const savedMessage = await newMessage.save();
    // Emit the new message to all connected clients via WebSocket if you have one
    // io.emit('new_maritime_message', savedMessage);
    res.status(201).json({ 
      message: 'Message sent successfully', 
      newMessage: savedMessage 
    });
  } catch (error) {
    console.error('Error sending maritime message:', error);
    res.status(500).json({ 
      error: 'Failed to send maritime message',
      details: error.message 
    });
  }
});


// Get all NGO messages
app.get('/api/ngo-groupchat', async (req, res) => {
  try {
    const ngoMessages = await Message.find({ responderType: "NGO" })
      .sort({ timestamp: 1 });
    res.json({
      groupName: "USERS GROUPCHAT",
      messages: ngoMessages
    });
  } catch (error) {
    console.error('Error fetching NGO group chat:', error);
    res.status(500).json({ 
      error: 'Failed to fetch NGO group chat',
      details: error.message 
    });
  }
});

// Send new NGO message
app.post('/api/send-ngo-message', async (req, res) => {
  try {
    const { messageText, senderName = 'NGO' } = req.body;
    if (!messageText) {
      return res.status(400).json({ error: 'Message text is required' });
    }
    const newMessage = new Message({
      text: messageText,
      sender: senderName,
      responderType: 'NGO',
      timestamp: new Date(),
      isRead: false,
      reportId: 'GROUP_CHAT' // Special ID for group chat messages
    });
    const savedMessage = await newMessage.save();
    // Emit the new message to all connected clients via WebSocket if you have one
    // io.emit('new_ngo_message', savedMessage);
    res.status(201).json({ 
      message: 'Message sent successfully', 
      newMessage: savedMessage 
    });
  } catch (error) {
    console.error('Error sending NGO message:', error);
    res.status(500).json({ 
      error: 'Failed to send NGO message',
      details: error.message 
    });
  }
});

// Get all PCG messages
app.get('/api/pcg-groupchat', async (req, res) => {
  try {
    const pcgMessages = await Message.find({ responderType: "PCG" })
      .sort({ timestamp: 1 });
    res.json({
      groupName: "USERS GROUPCHAT",
      messages: pcgMessages
    });
  } catch (error) {
    console.error('Error fetching PCG group chat:', error);
    res.status(500).json({ 
      error: 'Failed to fetch PCG group chat',
      details: error.message 
    });
  }
});

// Send new PCG message
app.post('/api/send-pcg-message', async (req, res) => {
  try {
    const { messageText, senderName = 'PCG' } = req.body;
    if (!messageText) {
      return res.status(400).json({ error: 'Message text is required' });
    }
    const newMessage = new Message({
      text: messageText,
      sender: senderName,
      responderType: 'PCG',
      timestamp: new Date(),
      isRead: false,
      reportId: 'GROUP_CHAT' // Special ID for group chat messages
    });
    const savedMessage = await newMessage.save();
    // Emit the new message to all connected clients via WebSocket if you have one
    // io.emit('new_pcg_message', savedMessage);
    res.status(201).json({ 
      message: 'Message sent successfully', 
      newMessage: savedMessage 
    });
  } catch (error) {
    console.error('Error sending PCG message:', error);
    res.status(500).json({ 
      error: 'Failed to send PCG message',
      details: error.message 
    });
  }
});
const PORT = process.env.PORT || 5000; // Use the PORT environment variable or fallback to 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));