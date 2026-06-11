const University = require('../models/University');
const Institution = require('../models/Institution');
const Destination = require('../models/Destination');

// @desc    Get universities with server-side pagination + filtering
// @route   GET /api/universities
const getUniversities = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
  const skip = (page - 1) * limit;

  // Build DB filter object from query params for first-level filtering
  const dbFilter = {};

  // Filter by course level
  if (req.query.courseLevel) {
    dbFilter.courseLevel = { $regex: req.query.courseLevel, $options: 'i' };
  }

  // Filter by field of study
  if (req.query.fieldOfStudy) {
    dbFilter.fieldOfStudy = { $regex: req.query.fieldOfStudy, $options: 'i' };
  }

  // Filter by tags
  if (req.query.tag) {
    dbFilter.tags = req.query.tag;
  }

  // Filter by gap accepted
  if (req.query.studyGap) {
    dbFilter.$or = [
      { gapLimit: { $exists: false } },
      { gapLimit: null },
      { gapLimit: { $gte: parseFloat(req.query.studyGap) } }
    ];
  }

  // Filter by max backlogs
  if (req.query.backlog) {
    const backlogFilter = [
      { maxBacklogs: { $exists: false } },
      { maxBacklogs: null },
      { maxBacklogs: { $gte: parseInt(req.query.backlog) } }
    ];
    if (dbFilter.$or) {
      dbFilter.$and = [{ $or: dbFilter.$or }, { $or: backlogFilter }];
      delete dbFilter.$or;
    } else {
      dbFilter.$or = backlogFilter;
    }
  }

  // Filter by MOI accepted
  if (req.query.acceptsMOI === 'Yes') {
    dbFilter.acceptsMOI = 'Yes';
  }

  try {
    // 1. Fetch all institutions populated with their destination
    const institutions = await Institution.find()
      .populate('destinationId')
      .lean();
    const instMap = new Map();
    institutions.forEach(inst => {
      instMap.set(inst._id.toString(), inst);
    });

    // 2. Fetch all matching universities from DB (without populate, lean)
    const universities = await University.find(dbFilter).sort({ _id: -1 }).lean();

    // 3. Attach institution object and filter in JS
    let results = [];
    for (const uni of universities) {
      const inst = uni.institutionId ? instMap.get(uni.institutionId.toString()) : null;
      uni.institutionId = inst;

      // Filter by Destination
      if (req.query.destination && req.query.destination !== 'All Destinations') {
        const destName = inst?.destinationId?.name || uni.country || '';
        if (destName.toLowerCase().trim() !== req.query.destination.toLowerCase().trim()) {
          continue;
        }
      }

      // Filter by Institution
      if (req.query.institution) {
        const instName = inst?.name || uni.name || '';
        if (!instName.toLowerCase().includes(req.query.institution.toLowerCase().trim())) {
          continue;
        }
      }

      // Filter by City
      if (req.query.city) {
        const city = inst?.city || uni.city || '';
        if (city.toLowerCase().trim() !== req.query.city.toLowerCase().trim()) {
          continue;
        }
      }

      // Filter by tuition fee range
      if (req.query.tuitionMin || req.query.tuitionMax) {
        const minFee = parseFloat(req.query.tuitionMin) || 0;
        const maxFee = parseFloat(req.query.tuitionMax) || 100000;
        const fee = parseFloat((uni.tuitionFee || '0').replace(/[^0-9.]/g, ''));
        if (fee < minFee || fee > maxFee) {
          continue;
        }
      }

      // Filter by program duration range
      if (req.query.durationMin || req.query.durationMax) {
        const dMin = parseInt(req.query.durationMin) || 1;
        const dMax = parseInt(req.query.durationMax) || 96;
        let months = 0;
        if (uni.duration) {
          const dStr = uni.duration.toString().toLowerCase();
          const val = parseFloat(dStr.replace(/[^0-9.]/g, '')) || 0;
          months = (dStr.includes('year') || dStr.includes('yr')) ? val * 12 : val;
        }
        // If uni.duration is missing or 0, we can skip filtering or keep it. Let's match frontend and keep it if duration is not set, or filter if specified.
        if (months > 0 && (months < dMin || months > dMax)) {
          continue;
        }
      }

      // Filter by intakes
      if (req.query.intakes) {
        const selectedIntakes = req.query.intakes.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        if (selectedIntakes.length > 0) {
          let allUniIntakes = [];
          if (Array.isArray(uni.intakes)) {
            uni.intakes.forEach(i => {
              allUniIntakes = allUniIntakes.concat(i.split(',').map(s => s.trim().toLowerCase()));
            });
          } else if (uni.intakes) {
            allUniIntakes = uni.intakes.split(',').map(i => i.trim().toLowerCase());
          }
          const matchesIntake = selectedIntakes.some(sel => {
            const parts = sel.split(' ');
            if (parts.length < 2) return false;
            const monthPrefix = parts[0].substring(0, 3);
            const year = parts[parts.length - 1];
            return allUniIntakes.some(uniIntake => {
              const uParts = uniIntake.trim().split(' ');
              if (uParts.length === 0) return false;
              const uMonthPrefix = uParts[0].substring(0, 3);
              if (uParts.length === 1 || !/\d/.test(uParts[uParts.length - 1])) {
                return uMonthPrefix === monthPrefix;
              }
              return uMonthPrefix === monthPrefix && uParts[uParts.length - 1] === year;
            });
          });
          if (!matchesIntake) continue;
        }
      }

      // Filter by English Requirements & MOI Exemption
      const requireEnglish = req.query.requireEnglish === 'true';
      const hasMOI = req.query.hasMOI === 'true';
      if (requireEnglish || hasMOI) {
        let meetsEnglish = false;
        let meetsMOI = false;

        if (requireEnglish && req.query.englishTest && req.query.scoreOA) {
          const test = req.query.englishTest;
          const scoreOA = parseFloat(req.query.scoreOA);
          const scoreS = req.query.scoreS ? parseFloat(req.query.scoreS) : null;

          if (uni.englishRequirements && uni.englishRequirements.length > 0) {
            const matchReq = uni.englishRequirements.find(r => r.testName === test);
            if (matchReq) {
              const testOA = scoreOA >= parseFloat(matchReq.minOverall || 0);
              const testS = scoreS !== null ? scoreS >= parseFloat(matchReq.minSection || 0) : true;
              if (testOA && testS) meetsEnglish = true;
            }
          }
        }

        if (hasMOI && uni.acceptsMOI === 'Yes') {
          meetsMOI = true;
        }

        if (requireEnglish && !hasMOI && !meetsEnglish) continue;
        if (!requireEnglish && hasMOI && !meetsMOI) continue;
        if (requireEnglish && hasMOI && !(meetsEnglish || meetsMOI)) continue;
      }

      // Filter by search term (course name, institution name, or city)
      if (req.query.search) {
        const searchLower = req.query.search.toLowerCase().trim();
        const cName = (uni.courseName || '').toLowerCase();
        const instName = (inst?.name || uni.name || '').toLowerCase();
        const city = (inst?.city || uni.city || '').toLowerCase();
        if (!cName.includes(searchLower) && !instName.includes(searchLower) && !city.includes(searchLower)) {
          continue;
        }
      }

      results.push(uni);
    }

    // 4. Paginate the fully filtered array
    const totalCount = results.length;
    const totalPages = Math.ceil(totalCount / limit);
    const paginatedResults = results.slice(skip, skip + limit);

    res.status(200).json({
      data: paginatedResults,
      page,
      limit,
      totalCount,
      totalPages,
      hasMore: page < totalPages
    });
  } catch (error) {
    console.error('getUniversities error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get lightweight metadata for filter dropdowns
// @route   GET /api/universities/meta
const getUniversitiesMeta = async (req, res) => {
  try {
    // Get all institutions with their destinations in one query
    const institutions = await Institution.find()
      .populate('destinationId')
      .lean();

    // Build unique lists
    const destinationMap = new Map();
    const institutionMap = new Map();
    const cityMap = new Map();

    institutions.forEach(inst => {
      const destName = inst.destinationId?.name;
      const destId = inst.destinationId?._id?.toString();
      if (destName && destId) {
        destinationMap.set(destId, { _id: destId, name: destName });
      }

      const instName = inst.name?.trim();
      const instId = inst._id?.toString();
      if (instName && instId) {
        institutionMap.set(instId, {
          _id: instId,
          name: instName,
          destinationId: destId,
          city: inst.city?.trim() || ''
        });
      }

      const city = inst.city?.trim();
      if (city) {
        cityMap.set(city.toLowerCase(), city);
      }
    });

    // Get unique course levels and fields of study from universities
    const [courseLevels, fieldsOfStudy] = await Promise.all([
      University.distinct('courseLevel'),
      University.distinct('fieldOfStudy')
    ]);

    res.status(200).json({
      destinations: Array.from(destinationMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      institutions: Array.from(institutionMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      cities: Array.from(cityMap.values()).sort(),
      courseLevels: courseLevels.filter(Boolean).sort(),
      fieldsOfStudy: fieldsOfStudy.filter(Boolean).sort(),
      totalCount: await University.estimatedDocumentCount()
    });
  } catch (error) {
    console.error('getUniversitiesMeta error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Set university
// @route   POST /api/universities
const setUniversity = async (req, res) => {
  // We assume the body contains all the fields from AdminAddUniversity.jsx
  const university = await University.create({
    ...req.body,
    createdBy: req.user.id
  });
  res.status(200).json(university);
};

// @desc    Get single university
// @route   GET /api/universities/:id
const getUniversityById = async (req, res) => {
  const university = await University.findById(req.params.id)
    .populate({
      path: 'institutionId',
      populate: {
        path: 'destinationId'
      }
    });

  if (!university) {
    res.status(404);
    throw new Error('University not found');
  }

  res.status(200).json(university);
};

// @desc    Update university
// @route   PUT /api/universities/:id
const updateUniversity = async (req, res) => {
  const university = await University.findById(req.params.id);

  if (!university) {
    res.status(404);
    throw new Error('University not found');
  }

  const updatedUniversity = await University.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true } // Return the updated document & run schema validators
  );

  res.status(200).json(updatedUniversity);
};

// @desc    Delete university
// @route   DELETE /api/universities/:id
const deleteUniversity = async (req, res) => {
  const university = await University.findById(req.params.id);

  if (!university) {
    res.status(404);
    throw new Error('University not found');
  }

  await university.deleteOne();

  res.status(200).json({ id: req.params.id, message: 'University deleted successfully' });
};

// @desc    Upload an image file to be used as a university logo
// @route   POST /api/universities/upload-logo
// @access  Private/Admin
const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    // Cloudinary URL is returned in req.file.path
    res.status(201).json({ url: req.file.path });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getUniversities,
  getUniversitiesMeta,
  setUniversity,
  getUniversityById,
  updateUniversity,
  deleteUniversity,
  uploadLogo
};