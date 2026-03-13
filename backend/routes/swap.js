const express = require('express');
const router = express.Router();
const ShiftSwapRequest = require('../models/ShiftSwapRequest');
const Shift = require('../models/Shift');
const Notification = require('../models/Notification');
const { protect, requireManagerOrSupervisor } = require('../middleware/auth');

// Create a swap request or post to "Open Shifts"
router.post('/', protect, async (req, res) => {
  try {
    const { shiftId, targetUserId, offeredShiftId, note } = req.body;
    
    // Verify shift belongs to user
    const shift = await Shift.findOne({ _id: shiftId, assignedEmployees: req.user._id });
    if (!shift) return res.status(403).json({ message: 'You are not assigned to this shift' });

    const swapRequest = await ShiftSwapRequest.create({
      requestingUser: req.user._id,
      targetUser: targetUserId,
      shiftId,
      offeredShiftId,
      company: req.user.company,
      note
    });

    if (targetUserId) {
      // Notify target user
      await Notification.create({
        userId: targetUserId,
        company: req.user.company,
        title: 'Shift Swap Request',
        message: `${req.user.name} wants to swap a shift with you.`,
        type: 'shift-response',
        data: { swapRequestId: swapRequest._id }
      });
    }

    res.status(201).json(swapRequest);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get swap requests
router.get('/', protect, async (req, res) => {
  try {
    const filter = { company: req.user.company };
    if (req.user.role === 'employee') {
      filter.$or = [
        { requestingUser: req.user._id },
        { targetUser: req.user._id },
        { targetUser: null, status: 'pending' } // Open shifts
      ];
    }

    const requests = await ShiftSwapRequest.find(filter)
      .populate('requestingUser', 'name email')
      .populate('targetUser', 'name email')
      .populate('shiftId')
      .populate('offeredShiftId')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Respond to swap request (Accept/Reject by Peer)
router.patch('/:id/respond', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const swap = await ShiftSwapRequest.findById(req.params.id);

    if (!swap) return res.status(404).json({ message: 'Request not found' });
    if (swap.targetUser && swap.targetUser.toString() !== req.user._id.toString()) {
        // If it's an open shift, anyone can claim it except the requester
        if (swap.requestingUser.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'Cannot claim your own shift' });
        }
        if (swap.targetUser) return res.status(403).json({ message: 'Not authorized' });
    }

    if (status === 'accepted') {
        swap.targetUser = req.user._id; // Set target user if it was an open shift
        swap.status = 'accepted';
    } else {
        swap.status = 'rejected';
    }

    await swap.save();

    // Notify requester
    await Notification.create({
      userId: swap.requestingUser,
      company: req.user.company,
      title: `Swap Request ${status}`,
      message: `${req.user.name} has ${status} your shift swap request.`,
      type: 'shift-response',
      data: { swapRequestId: swap._id, status }
    });

    res.json(swap);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Finalize swap (Manager Approval)
router.patch('/:id/approve', protect, requireManagerOrSupervisor, async (req, res) => {
  try {
    const { status } = req.body;
    const swap = await ShiftSwapRequest.findById(req.params.id);

    if (!swap || swap.status !== 'accepted') {
        return res.status(400).json({ message: 'Request not ready for approval' });
    }

    swap.managerStatus = status;
    if (status === 'approved') {
        swap.status = 'completed';
        
        // Execute the swap in the Shift model
        const shift = await Shift.findById(swap.shiftId);
        if (shift) {
            // Remove requester, add target
            shift.assignedEmployees = shift.assignedEmployees.filter(id => id.toString() !== swap.requestingUser.toString());
            if (!shift.assignedEmployees.includes(swap.targetUser)) {
                shift.assignedEmployees.push(swap.targetUser);
            }
            // Update assignments array too
            const reqIdx = shift.assignments.findIndex(a => a.employee.toString() === swap.requestingUser.toString());
            if (reqIdx !== -1) shift.assignments.splice(reqIdx, 1);
            shift.assignments.push({ employee: swap.targetUser, status: 'accepted', updatedAt: new Date() });
            
            await shift.save();
        }

        // Handle offered shift if it exists
        if (swap.offeredShiftId) {
            const offShift = await Shift.findById(swap.offeredShiftId);
            if (offShift) {
                offShift.assignedEmployees = offShift.assignedEmployees.filter(id => id.toString() !== swap.targetUser.toString());
                if (!offShift.assignedEmployees.includes(swap.requestingUser)) {
                    offShift.assignedEmployees.push(swap.requestingUser);
                }
                const tarIdx = offShift.assignments.findIndex(a => a.employee.toString() === swap.targetUser.toString());
                if (tarIdx !== -1) offShift.assignments.splice(tarIdx, 1);
                offShift.assignments.push({ employee: swap.requestingUser, status: 'accepted', updatedAt: new Date() });
                
                await offShift.save();
            }
        }
    } else {
        swap.status = 'rejected';
    }

    await swap.save();
    res.json(swap);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
