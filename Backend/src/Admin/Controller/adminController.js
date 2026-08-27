const ResumeAnalysis = require('../../models/ResumeAnalysis');

// ==========================================
// 1. CREATE: Manually add candidate record
// ==========================================
const createCandidate = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      targetRole,
      experienceYears,
      expectedSalary,
      portfolioOrLinkedIn,
      jobDescription,
      rawText,
      finalAtsScore
    } = req.body;

    if (!fullName || !email || !phone || !targetRole) {
      return res.status(400).json({
        success: false,
        error: 'fullName, email, phone, and targetRole are required fields.'
      });
    }

    const newCandidate = await ResumeAnalysis.create({
      candidateDetails: {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        targetRole: targetRole.trim(),
        experienceYears: Number(experienceYears) || 0,
        expectedSalary: expectedSalary || '',
        portfolioOrLinkedIn: portfolioOrLinkedIn || ''
      },
      jobDescription: jobDescription || '',
      fileName: 'Admin Manual Entry',
      fileSize: '0 KB',
      rawText: rawText || 'Manually added by admin',
      finalAtsScore: Number(finalAtsScore) || 0
    });

    return res.status(201).json({
      success: true,
      message: 'Candidate created successfully by admin',
      data: newCandidate
    });
  } catch (error) {
    console.error('Error creating candidate:', error);
    return res.status(500).json({ success: false, error: 'Failed to create candidate record' });
  }
};

// ==========================================
// 2. READ: Get all candidates (with search/filter)
// ==========================================
const getAllCandidates = async (req, res) => {
  try {
    const { search, role, minScore, page = 1, limit = 10 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { 'candidateDetails.fullName': { $regex: search, $options: 'i' } },
        { 'candidateDetails.email': { $regex: search, $options: 'i' } },
        { detectedSkills: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    if (role) {
      query['candidateDetails.targetRole'] = { $regex: role, $options: 'i' };
    }

    if (minScore) {
      query.finalAtsScore = { $gte: Number(minScore) };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [candidates, total] = await Promise.all([
      ResumeAnalysis.find(query)
        .select('-rawText')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ResumeAnalysis.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit)
      },
      candidates
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch candidate list' });
  }
};

// ==========================================
// 3. READ: Get single candidate by ID
// ==========================================
const getCandidateById = async (req, res) => {
  try {
    const candidate = await ResumeAnalysis.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate record not found' });
    }
    return res.status(200).json({ success: true, candidate });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve candidate profile' });
  }
};

// ==========================================
// 4. UPDATE: Modify candidate info or ATS score
// ==========================================
const updateCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    const updatePayload = {};

    // Map candidate form details
    if (req.body.candidateDetails) {
      updatePayload.candidateDetails = req.body.candidateDetails;
    }
    if (req.body.finalAtsScore !== undefined) {
      updatePayload.finalAtsScore = Number(req.body.finalAtsScore);
    }
    if (req.body.jobDescription) {
      updatePayload.jobDescription = req.body.jobDescription;
    }

    const updatedCandidate = await ResumeAnalysis.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    );

    if (!updatedCandidate) {
      return res.status(404).json({ success: false, error: 'Candidate record not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Candidate record updated successfully',
      data: updatedCandidate
    });
  } catch (error) {
    console.error('Error updating candidate:', error);
    return res.status(500).json({ success: false, error: 'Failed to update candidate record' });
  }
};

// ==========================================
// 5. DELETE: Remove candidate record
// ==========================================
const deleteCandidate = async (req, res) => {
  try {
    const deleted = await ResumeAnalysis.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Candidate record not found' });
    }
    return res.status(200).json({ success: true, message: 'Candidate record deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to delete candidate record' });
  }
};

// ==========================================
// 6. STATS: Overview analytics
// ==========================================
const getDashboardStats = async (req, res) => {
  try {
    const totalApplicants = await ResumeAnalysis.countDocuments();
    const avgScoreAgg = await ResumeAnalysis.aggregate([
      { $group: { _id: null, avgScore: { $avg: '$finalAtsScore' } } }
    ]);
    const averageScore = avgScoreAgg.length > 0 ? Math.round(avgScoreAgg[0].avgScore) : 0;

    const shortlistedCount = await ResumeAnalysis.countDocuments({
      $or: [{ 'aiAnalysis.verdict': /shortlisted/i }, { finalAtsScore: { $gte: 75 } }]
    });

    const topSkillsAgg = await ResumeAnalysis.aggregate([
      { $unwind: '$detectedSkills' },
      { $group: { _id: '$detectedSkills', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalApplicants,
        averageScore,
        shortlistedCount,
        topSkills: topSkillsAgg.map((s) => ({ skill: s._id, count: s.count }))
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
  }
};

module.exports = {
  createCandidate,
  getAllCandidates,
  getCandidateById,
  updateCandidate,
  deleteCandidate,
  getDashboardStats
};