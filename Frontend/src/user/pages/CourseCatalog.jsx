import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { courseApi } from '../services/courseApi';
import { useToast } from '../../hooks/useToast';
import Loader from '../../components/common/Loader';
import CourseSearchFilter from '../catalog/CourseSearchFilter';
import CourseCatalogGrid from '../catalog/CourseCatalogGrid';
import CourseEnrollModal from '../enrollment/CourseEnrollModal';

const CourseCatalog = () => {
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [selectedCourseForEnroll, setSelectedCourseForEnroll] = useState(null);

  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // If user searched admin in URL (e.g. localhost:5173/courses?search=admin or ?admin or ?q=admin)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchParam = params.get('search') || params.get('q') || '';
    if (params.has('admin') || searchParam.toLowerCase().includes('admin')) {
      navigate('/admin');
    } else if (searchParam) {
      setSearchQuery(searchParam);
    }
  }, [location.search, navigate]);

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const data = await courseApi.getCourses();
      setCourses(data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load courses catalog');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleEnrollSuccess = () => {
    fetchCourses();
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      const q = searchQuery.trim().toLowerCase();
      if (q === 'admin' || q === '/admin') {
        navigate('/admin');
      }
    }
  };

  // Filter courses by search and level
  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      (course.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.instructor || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLevel =
      selectedLevel === 'All' ||
      course.level?.toLowerCase() === selectedLevel.toLowerCase();

    return matchesSearch && matchesLevel;
  });

  return (
    <div className="page-wrapper">
      <div className="app-container">
        {/* Search & Filter Header */}
        <CourseSearchFilter
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedLevel={selectedLevel}
          setSelectedLevel={setSelectedLevel}
          handleSearchKeyDown={handleSearchKeyDown}
        />

        {/* Courses Catalog Grid */}
        {isLoading ? (
          <Loader text="Fetching industry curricula from MongoDB database..." />
        ) : (
          <CourseCatalogGrid
            courses={courses}
            filteredCourses={filteredCourses}
            onOpenEnroll={(course) => setSelectedCourseForEnroll(course)}
            onResetFilter={() => {
              setSearchQuery('');
              setSelectedLevel('All');
            }}
          />
        )}

        {/* AI ATS Enrollment Modal */}
        {selectedCourseForEnroll && (
          <CourseEnrollModal
            isOpen={Boolean(selectedCourseForEnroll)}
            onClose={() => setSelectedCourseForEnroll(null)}
            course={selectedCourseForEnroll}
            onEnrollSuccess={handleEnrollSuccess}
          />
        )}
      </div>
    </div>
  );
};

export default CourseCatalog;
