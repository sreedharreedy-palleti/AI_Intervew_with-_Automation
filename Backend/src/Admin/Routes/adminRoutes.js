const express = require('express');
const router = express.Router();
const {
  createCandidate,
  getAllCandidates,
  getCandidateById,
  updateCandidate,
  deleteCandidate,
  getDashboardStats
} = require('../Controller/adminController');

// Analytics Overview
router.get('/stats', getDashboardStats);

// Candidate CRUD Endpoints
router.post('/candidates', createCandidate);         // CREATE
router.get('/candidates', getAllCandidates);          // READ ALL
router.get('/candidates/:id', getCandidateById);      // READ ONE
router.put('/candidates/:id', updateCandidate);       // UPDATE
router.delete('/candidates/:id', deleteCandidate);    // DELETE

module.exports = router;