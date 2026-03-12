const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const { protect, requireManager } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const filter = { company: req.user.company };
    if (req.user.role === 'employee') filter.assignedTo = req.user._id;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;

    const tasks = await Task.find(filter).populate('assignedTo', 'name email').populate('createdBy', 'name').sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, requireManager, async (req, res) => {
  try {
    const task = await Task.create({ ...req.body, company: req.user.company, createdBy: req.user._id });

    if (task.assignedTo?.length) {
      await Notification.insertMany(task.assignedTo.map(id => ({
        userId: id,
        company: req.user.company,
        title: 'New Task Assigned',
        message: `Task: ${task.title}`,
        type: 'task-assigned',
        data: { taskId: task._id }
      })));
    }
    res.status(201).json(task);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', protect, async (req, res) => {
  try {
    if (req.body.status === 'completed') req.body.completedAt = new Date();

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company },
      req.body,
      { new: true }
    );
    if (!task) return res.status(404).json({ message: 'Not found' });
    res.json(task);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', protect, requireManager, async (req, res) => {
  try {
    const result = await Task.findOneAndDelete({ _id: req.params.id, company: req.user.company });
    if (!result) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
