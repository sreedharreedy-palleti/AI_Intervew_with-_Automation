import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  FileBarChart,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Search,
  RefreshCw,
  Code2,
  Mic,
  Award,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle,
  UserCheck,
  UserX,
  Sparkles,
} from 'lucide-react';

import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import { useToast } from '../../hooks/useToast';
import { adminApi } from '../../api/adminApi';

const AdminReports = () => {
  const [activeTab, setActiveTab] = useState('ASSIGNMENTS'); // 'ASSIGNMENTS' | 'INTERVIEWS'

  // Assignment reports state
  const [assignmentReports, setAssignmentReports] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState('ALL'); // 'ALL' | 'QUALIFIED' | 'DISQUALIFIED' | 'SHORTLISTED' | 'NOT_SHORTLISTED'
  const [decisionLoadingId, setDecisionLoadingId] = useState(null);

  // Interview reports state
  const [interviewReports, setInterviewReports] = useState([]);
  const [interviewsLoading, setInterviewsLoading] = useState(true);
  const [interviewSearch, setInterviewSearch] = useState('');
  const [selectedInterviewModal, setSelectedInterviewModal] = useState(null);

  const toast = useToast();

  // Fetch Assignment Reports
  const fetchAssignmentReports = useCallback(async () => {
    setAssignmentsLoading(true);
    try {
      const res = await adminApi.getAssignmentReports();
      setAssignmentReports(res?.reports || []);
    } catch (err) {
      console.error('Failed to load assignment reports:', err);
      toast.error('Failed to load AI assignment reports');
    } finally {
      setAssignmentsLoading(false);
    }
  }, [toast]);

  // Fetch Interview Reports
  const fetchInterviewReports = useCallback(async () => {
    setInterviewsLoading(true);
    try {
      const res = await adminApi.getInterviewReports();
      setInterviewReports(res?.reports || []);
    } catch (err) {
      console.error('Failed to load interview reports:', err);
      toast.error('Failed to load AI interview reports');
    } finally {
      setInterviewsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAssignmentReports();
    fetchInterviewReports();
  }, [fetchAssignmentReports, fetchInterviewReports]);

  // Handle Admin Shortlist / Disqualify Decision
  const handleUpdateDecision = async (report, decision) => {
    const actionKey = `${report.course_id}_${report.user_id}_${report.assignment_token}`;
    setDecisionLoadingId(actionKey);
    try {
      await adminApi.updateAssignmentDecision({
        course_id: report.course_id,
        user_id: report.user_id,
        assignment_token: report.assignment_token,
        decision: decision, // 'shortlisted' | 'not_shortlisted'
      });

      const isShortlisted = decision === 'shortlisted';
      toast.success(
        isShortlisted
          ? `Candidate "${report.candidate_name}" is shortlisted for the next AI Interview!`
          : `Candidate "${report.candidate_name}" marked as Not Shortlisted.`
      );

      // Optimistically update state
      setAssignmentReports((prev) =>
        prev.map((item) => {
          if (
            (item.assignment_token && item.assignment_token === report.assignment_token) ||
            (item.course_id === report.course_id && item.user_id === report.user_id)
          ) {
            return {
              ...item,
              interview_shortlisted: isShortlisted,
              interview_status: isShortlisted
                ? 'Shortlisted for Interview'
                : 'Not Shortlisted',
            };
          }
          return item;
        })
      );
    } catch (err) {
      console.error('Failed to update shortlist decision:', err);
      toast.error(err.message || 'Failed to update interview decision');
    } finally {
      setDecisionLoadingId(null);
    }
  };

  // Export Interview Reports to Excel (.xlsx)
  const handleExportInterviewsToExcel = () => {
    try {
      if (!interviewReports || interviewReports.length === 0) {
        toast.error('No interview reports to export');
        return;
      }

      const rows = interviewReports.map((item, index) => ({
        'S.No': index + 1,
        'Candidate Name': item.candidate_name || 'N/A',
        'Candidate Email': item.candidate_email || 'N/A',
        'Course Title': item.course_title || 'N/A',
        'Minutes to Complete': `${item.duration_minutes || 0} mins`,
        'Interview Score (%)': item.interview_score ?? 0,
        'Technical Score': item.technical_score ?? 0,
        'Communication Score': item.communication_score ?? 0,
        'Problem Solving Score': item.problem_solving_score ?? 0,
        'Hiring Verdict': item.hiring_verdict || 'Pending',
        'Session Status': item.status || 'in_progress',
        'Started At': item.started_at ? new Date(item.started_at).toLocaleString() : 'N/A',
        'Completed At': item.completed_at ? new Date(item.completed_at).toLocaleString() : 'N/A',
        'Executive Summary': item.executive_summary || 'N/A',
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);

      // Auto-fit column widths
      const colWidths = [
        { wch: 6 },  // S.No
        { wch: 22 }, // Name
        { wch: 28 }, // Email
        { wch: 32 }, // Course
        { wch: 20 }, // Minutes
        { wch: 18 }, // Interview Score
        { wch: 16 }, // Technical Score
        { wch: 18 }, // Communication
        { wch: 20 }, // Problem Solving
        { wch: 24 }, // Verdict
        { wch: 16 }, // Status
        { wch: 22 }, // Started At
        { wch: 22 }, // Completed At
        { wch: 45 }, // Summary
      ];
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'AI Interview Reports');

      const today = new Date().toISOString().split('T')[0];
      const filename = `AI_Interview_Reports_${today}.xlsx`;

      XLSX.writeFile(workbook, filename);
      toast.success(`Successfully downloaded ${filename}`);
    } catch (err) {
      console.error('Failed to export to Excel:', err);
      toast.error('Failed to generate Excel file');
    }
  };

  // Export Assignment Reports to Excel (.xlsx)
  const handleExportAssignmentsToExcel = () => {
    try {
      if (!assignmentReports || assignmentReports.length === 0) {
        toast.error('No assignment reports to export');
        return;
      }

      const rows = assignmentReports.map((item, index) => ({
        'S.No': index + 1,
        'Candidate Name': item.candidate_name || 'N/A',
        'Gmail / Email': item.candidate_email || 'N/A',
        'Course Title': item.course_title || 'N/A',
        'Final Coding Score (%)': item.final_score ?? 0,
        'Qualifies for Next Round': item.qualifies_for_interview ? 'YES (Score >= 50%)' : 'NO (Score < 50%)',
        'Interview Shortlist Decision':
          item.interview_shortlisted === true
            ? 'Shortlisted'
            : item.interview_shortlisted === false
            ? 'Not Shortlisted'
            : 'Pending Decision',
        'Assignment Status': item.status || 'pending',
        'Submitted At': item.submitted_at ? new Date(item.submitted_at).toLocaleString() : 'Pending',
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet['!cols'] = [
        { wch: 6 },
        { wch: 24 },
        { wch: 30 },
        { wch: 32 },
        { wch: 22 },
        { wch: 26 },
        { wch: 28 },
        { wch: 18 },
        { wch: 22 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'AI Assignment Reports');

      const today = new Date().toISOString().split('T')[0];
      const filename = `AI_Assignment_Reports_${today}.xlsx`;

      XLSX.writeFile(workbook, filename);
      toast.success(`Successfully downloaded ${filename}`);
    } catch (err) {
      console.error('Failed to export assignments to Excel:', err);
      toast.error('Failed to generate Excel file');
    }
  };

  // Filtered Assignment Reports
  const filteredAssignments = useMemo(() => {
    return assignmentReports.filter((item) => {
      const q = assignmentSearch.toLowerCase();
      const matchesSearch =
        (item.candidate_name || '').toLowerCase().includes(q) ||
        (item.candidate_email || '').toLowerCase().includes(q) ||
        (item.course_title || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (assignmentFilter === 'QUALIFIED') return item.qualifies_for_interview === true;
      if (assignmentFilter === 'DISQUALIFIED') return item.qualifies_for_interview === false;
      if (assignmentFilter === 'SHORTLISTED') return item.interview_shortlisted === true;
      if (assignmentFilter === 'NOT_SHORTLISTED') return item.interview_shortlisted === false;

      return true;
    });
  }, [assignmentReports, assignmentSearch, assignmentFilter]);

  // Filtered Interview Reports
  const filteredInterviews = useMemo(() => {
    return interviewReports.filter((item) => {
      const q = interviewSearch.toLowerCase();
      return (
        (item.candidate_name || '').toLowerCase().includes(q) ||
        (item.candidate_email || '').toLowerCase().includes(q) ||
        (item.course_title || '').toLowerCase().includes(q) ||
        (item.hiring_verdict || '').toLowerCase().includes(q)
      );
    });
  }, [interviewReports, interviewSearch]);

  // Statistics Computations
  const assignmentStats = useMemo(() => {
    const total = assignmentReports.length;
    const qualified = assignmentReports.filter((r) => r.qualifies_for_interview).length;
    const disqualified = total - qualified;
    const shortlisted = assignmentReports.filter((r) => r.interview_shortlisted === true).length;
    const notShortlisted = assignmentReports.filter((r) => r.interview_shortlisted === false).length;
    return { total, qualified, disqualified, shortlisted, notShortlisted };
  }, [assignmentReports]);

  const interviewStats = useMemo(() => {
    const total = interviewReports.length;
    const completed = interviewReports.filter((r) => r.status === 'completed').length;
    const avgScore =
      total > 0
        ? Math.round(
            interviewReports.reduce((acc, curr) => acc + (curr.interview_score || 0), 0) / total
          )
        : 0;
    const avgMins =
      total > 0
        ? (
            interviewReports.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0) / total
          ).toFixed(1)
        : '0.0';
    return { total, completed, avgScore, avgMins };
  }, [interviewReports]);

  return (
    <div style={{ padding: '1.75rem', maxWidth: '1440px', margin: '0 auto', color: '#fff' }}>
      <style>{`
        .filter-pill-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.42rem 0.85rem;
          border-radius: 9999px;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid transparent;
          user-select: none;
        }
        .filter-pill-btn:hover {
          transform: translateY(-1px);
        }
        .filter-pill-btn:active {
          transform: translateY(0);
        }
        select.custom-filter-select {
          color-scheme: dark !important;
          background-color: #0f172a !important;
          color: #f8fafc !important;
        }
        select.custom-filter-select option {
          background-color: #0f172a !important;
          color: #f8fafc !important;
          padding: 8px 12px !important;
        }
        select.custom-filter-select option:checked,
        select.custom-filter-select option:hover {
          background-color: #1e293b !important;
          color: #38bdf8 !important;
        }
      `}</style>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1.75rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
              }}
            >
              <FileBarChart size={20} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
              AI Evaluation & Performance Reports
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
            Live assessment scoring, interview shortlist controls, and AI voice telemetry with Excel export.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => {
              fetchAssignmentReports();
              fetchInterviewReports();
            }}
            className="btn btn-secondary btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: '#38bdf8',
              borderColor: 'rgba(56, 189, 248, 0.4)',
            }}
            title="Refresh reports from MongoDB"
          >
            <RefreshCw size={14} className={assignmentsLoading || interviewsLoading ? 'animate-spin' : ''} />
            <span>Sync Live Data</span>
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.35rem',
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('ASSIGNMENTS')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: activeTab === 'ASSIGNMENTS' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'transparent',
            color: activeTab === 'ASSIGNMENTS' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.9rem',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <Code2 size={16} />
          <span>AI Assignment Reports</span>
          <span
            style={{
              padding: '0.15rem 0.5rem',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: 800,
              background: activeTab === 'ASSIGNMENTS' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              color: '#fff',
            }}
          >
            {assignmentReports.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('INTERVIEWS')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: activeTab === 'INTERVIEWS' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
            color: activeTab === 'INTERVIEWS' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.9rem',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <Mic size={16} />
          <span>AI Interview Reports</span>
          <span
            style={{
              padding: '0.15rem 0.5rem',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: 800,
              background: activeTab === 'INTERVIEWS' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              color: '#fff',
            }}
          >
            {interviewReports.length}
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: AI ASSIGNMENT REPORTS                              */}
      {/* ========================================================= */}
      {activeTab === 'ASSIGNMENTS' && (
        <div>
          {/* Summary Metric Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <Card style={{ padding: '1rem 1.25rem', background: '#0e1626' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Total Assignments</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.25rem' }}>
                {assignmentStats.total}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Monitored candidate exams</div>
            </Card>

            <Card style={{ padding: '1rem 1.25rem', background: '#0e1626' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Qualified Candidates</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>
                {assignmentStats.qualified}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem' }}>
                Score ≥ 50% benchmark
              </div>
            </Card>

            <Card style={{ padding: '1rem 1.25rem', background: '#0e1626' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Interview Shortlisted</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.25rem' }}>
                {assignmentStats.shortlisted}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '0.25rem' }}>Ready for Voice Interview</div>
            </Card>

            <Card style={{ padding: '1rem 1.25rem', background: '#0e1626' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Not Shortlisted</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f43f5e', marginTop: '0.25rem' }}>
                {assignmentStats.notShortlisted}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#f43f5e', marginTop: '0.25rem' }}>Disqualified / score below 50%</div>
            </Card>
          </div>

          {/* Search, Filter & Export Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
              <Search
                size={15}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
              />
              <input
                type="text"
                placeholder="Search candidate name, gmail, or course..."
                value={assignmentSearch}
                onChange={(e) => setAssignmentSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.85rem 0.55rem 2.25rem',
                  background: '#0f172a',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {/* Dropdown Select with explicit high-contrast colors and dark color-scheme */}
              <select
                value={assignmentFilter}
                onChange={(e) => setAssignmentFilter(e.target.value)}
                className="custom-filter-select"
                style={{
                  padding: '0.55rem 0.85rem',
                  background: '#0f172a',
                  color: '#f8fafc',
                  colorScheme: 'dark',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option style={{ background: '#0f172a', color: '#f8fafc' }} value="ALL">
                  All Statuses ({assignmentReports.length})
                </option>
                <option style={{ background: '#0f172a', color: '#34d399', fontWeight: 600 }} value="QUALIFIED">
                  ✓ Qualified Only (≥ 50%)
                </option>
                <option style={{ background: '#0f172a', color: '#fb7185', fontWeight: 600 }} value="DISQUALIFIED">
                  ✗ Not Qualified (&lt; 50%)
                </option>
                <option style={{ background: '#0f172a', color: '#38bdf8', fontWeight: 600 }} value="SHORTLISTED">
                  ★ Interview Shortlisted
                </option>
                <option style={{ background: '#0f172a', color: '#fb923c', fontWeight: 600 }} value="NOT_SHORTLISTED">
                  ⊘ Not Shortlisted
                </option>
              </select>

              <button
                type="button"
                onClick={handleExportAssignmentsToExcel}
                className="btn btn-secondary btn-sm"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  color: '#38bdf8',
                  borderColor: 'rgba(56, 189, 248, 0.4)',
                  background: 'rgba(56, 189, 248, 0.08)',
                  padding: '0.55rem 1rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <FileSpreadsheet size={15} color="#38bdf8" />
                <span>Export Assignment Excel (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Assignment Table */}
          <Card style={{ overflow: 'hidden', padding: 0 }}>
            {assignmentsLoading ? (
              <div style={{ padding: '3.5rem 1rem' }}>
                <Loader text="Loading AI assignment candidate reports..." />
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Code2 size={42} style={{ margin: '0 auto 1rem', opacity: 0.3, color: '#38bdf8' }} />
                <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '0.35rem' }}>No Assignment Reports Found</h3>
                <p style={{ fontSize: '0.85rem', maxWidth: '440px', margin: '0 auto' }}>
                  No candidate submissions match your current search or filter criteria.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: 'rgba(255, 255, 255, 0.02)',
                        color: 'var(--text-muted)',
                        fontSize: '0.78rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      <th style={{ padding: '0.85rem 1rem' }}>Candidate</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Course Track</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Final Score</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Qualifies for Next Round</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Interview Status</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'center', minWidth: '220px' }}>
                        Shortlist Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssignments.map((report) => {
                      const actionKey = `${report.course_id}_${report.user_id}_${report.assignment_token}`;
                      const isRowBusy = decisionLoadingId === actionKey;
                      const isPassed = report.qualifies_for_interview;

                      return (
                        <tr
                          key={actionKey}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          {/* Candidate Username & Gmail */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ fontWeight: 700, color: '#f8fafc' }}>{report.candidate_name}</div>
                            <div style={{ color: '#38bdf8', fontSize: '0.78rem', marginTop: '2px' }}>
                              {report.candidate_email}
                            </div>
                            {report.unique_code && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Passcode: <code>{report.unique_code}</code>
                              </div>
                            )}
                          </td>

                          {/* Course Track */}
                          <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>
                            <div style={{ fontWeight: 600 }}>{report.course_title}</div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Status: <span style={{ textTransform: 'capitalize' }}>{report.status}</span>
                            </div>
                          </td>

                          {/* Final Score */}
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '9999px',
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                background: isPassed ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                                color: isPassed ? '#10b981' : '#f43f5e',
                                border: isPassed ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(244, 63, 94, 0.3)',
                              }}
                            >
                              <span>{report.final_score}%</span>
                            </div>
                          </td>

                          {/* Qualifies for Next Round */}
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                            {isPassed ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  padding: '0.3rem 0.75rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  color: '#34d399',
                                  border: '1px solid rgba(16, 185, 129, 0.4)',
                                }}
                              >
                                <CheckCircle size={13} color="#34d399" />
                                <span>Qualifies (Score ≥ 50%)</span>
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  padding: '0.3rem 0.75rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  background: 'rgba(244, 63, 94, 0.15)',
                                  color: '#fb7185',
                                  border: '1px solid rgba(244, 63, 94, 0.4)',
                                }}
                              >
                                <XCircle size={13} color="#fb7185" />
                                <span>Not Qualified (&lt; 50%)</span>
                              </span>
                            )}
                          </td>

                          {/* Current Interview Decision Status */}
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                            {report.interview_shortlisted === true ? (
                              <span
                                style={{
                                  padding: '0.3rem 0.75rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  background: 'rgba(56, 189, 248, 0.15)',
                                  color: '#38bdf8',
                                  border: '1px solid rgba(56, 189, 248, 0.4)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                }}
                              >
                                <Sparkles size={12} color="#38bdf8" />
                                <span>Shortlisted for Interview</span>
                              </span>
                            ) : report.interview_shortlisted === false ? (
                              <span
                                style={{
                                  padding: '0.3rem 0.75rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  background: 'rgba(251, 146, 60, 0.15)',
                                  color: '#fb923c',
                                  border: '1px solid rgba(251, 146, 60, 0.4)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                }}
                              >
                                <UserX size={12} color="#fb923c" />
                                <span>Not Shortlisted</span>
                              </span>
                            ) : (
                              <span
                                style={{
                                  padding: '0.3rem 0.75rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  background: 'rgba(245, 158, 11, 0.15)',
                                  color: '#fcd34d',
                                  border: '1px solid rgba(245, 158, 11, 0.4)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                }}
                              >
                                <Clock size={12} color="#fcd34d" />
                                <span>Pending Decision</span>
                              </span>
                            )}
                          </td>

                          {/* The Two Requested Action Buttons: Interview Shortlisted & Not Shortlisted */}
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                              {/* 1) Interview Shortlisted Button */}
                              <button
                                type="button"
                                disabled={isRowBusy}
                                onClick={() => handleUpdateDecision(report, 'shortlisted')}
                                title="Mark candidate as shortlisted for next AI Interview round"
                                className="btn btn-sm"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  padding: '0.32rem 0.75rem',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  color: report.interview_shortlisted === true ? '#ffffff' : '#34d399',
                                  background:
                                    report.interview_shortlisted === true
                                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                      : 'rgba(16, 185, 129, 0.12)',
                                  borderColor:
                                    report.interview_shortlisted === true
                                      ? '#10b981'
                                      : 'rgba(16, 185, 129, 0.4)',
                                  border: '1px solid',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                }}
                              >
                                <UserCheck size={13} color={report.interview_shortlisted === true ? '#fff' : '#34d399'} />
                                <span>Interview Shortlisted</span>
                              </button>

                              {/* 2) Not Shortlisted Button */}
                              <button
                                type="button"
                                disabled={isRowBusy}
                                onClick={() => handleUpdateDecision(report, 'not_shortlisted')}
                                title="Mark candidate as not shortlisted for the interview round"
                                className="btn btn-sm"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  padding: '0.32rem 0.75rem',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  color: report.interview_shortlisted === false ? '#ffffff' : '#fb7185',
                                  background:
                                    report.interview_shortlisted === false
                                      ? 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)'
                                      : 'rgba(244, 63, 94, 0.12)',
                                  borderColor:
                                    report.interview_shortlisted === false
                                      ? '#f43f5e'
                                      : 'rgba(244, 63, 94, 0.4)',
                                  border: '1px solid',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                }}
                              >
                                <UserX size={13} color={report.interview_shortlisted === false ? '#fff' : '#fb7185'} />
                                <span>Not Shortlisted</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: AI INTERVIEW REPORTS                               */}
      {/* ========================================================= */}
      {activeTab === 'INTERVIEWS' && (
        <div>
          {/* Summary Metric Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <Card style={{ padding: '1rem 1.25rem', background: '#0e1626' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Total Interviews</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.25rem' }}>
                {interviewStats.total}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                {interviewStats.completed} completed sessions
              </div>
            </Card>

            <Card style={{ padding: '1rem 1.25rem', background: '#0e1626' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Avg Completion Time</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.25rem' }}>
                {interviewStats.avgMins} <span style={{ fontSize: '1rem', fontWeight: 600 }}>mins</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '0.25rem' }}>Per completed interview</div>
            </Card>

            <Card style={{ padding: '1rem 1.25rem', background: '#0e1626' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Average Interview Score</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>
                {interviewStats.avgScore}%
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem' }}>AI voice & technical rating</div>
            </Card>

            <Card style={{ padding: '1rem 1.25rem', background: '#0e1626' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Excel Telemetry Export</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#cbd5e1', marginTop: '0.5rem' }}>
                One-Click Export
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                Full candidate spreadsheet (.xlsx)
              </div>
            </Card>
          </div>

          {/* Search & THE REQUESTED EXCEL DOWNLOAD BUTTON */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
              <Search
                size={15}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
              />
              <input
                type="text"
                placeholder="Search candidate name, email, or course..."
                value={interviewSearch}
                onChange={(e) => setInterviewSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.85rem 0.55rem 2.25rem',
                  background: '#0f172a',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            {/* THE REQUESTED DOWNLOAD EXCEL BUTTON */}
            <button
              type="button"
              onClick={handleExportInterviewsToExcel}
              className="btn btn-primary btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.55rem 1.25rem',
                fontSize: '0.88rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderColor: '#10b981',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                cursor: 'pointer',
              }}
              title="Download all interview candidate records as an Excel file (.xlsx)"
            >
              <Download size={16} />
              <span>Download Excel File (.xlsx)</span>
            </button>
          </div>

          {/* Interview Table */}
          <Card style={{ overflow: 'hidden', padding: 0 }}>
            {interviewsLoading ? (
              <div style={{ padding: '3.5rem 1rem' }}>
                <Loader text="Loading AI interview candidate reports..." />
              </div>
            ) : filteredInterviews.length === 0 ? (
              <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Mic size={42} style={{ margin: '0 auto 1rem', opacity: 0.3, color: '#10b981' }} />
                <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '0.35rem' }}>No Interview Reports Found</h3>
                <p style={{ fontSize: '0.85rem', maxWidth: '440px', margin: '0 auto' }}>
                  Candidate AI voice interviews will appear here once candidates attend their scheduled interview.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: 'rgba(255, 255, 255, 0.02)',
                        color: 'var(--text-muted)',
                        fontSize: '0.78rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      <th style={{ padding: '0.85rem 1rem' }}>Candidate</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Course Track</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Duration (Minutes)</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Interview Score</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Hiring Verdict</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Scorecard</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInterviews.map((intv) => {
                      const isHigh = (intv.interview_score || 0) >= 50.0;
                      return (
                        <tr
                          key={intv.id || intv.interview_token}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          {/* Candidate Username & Email */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ fontWeight: 700, color: '#f8fafc' }}>{intv.candidate_name}</div>
                            <div style={{ color: '#38bdf8', fontSize: '0.78rem', marginTop: '2px' }}>
                              {intv.candidate_email}
                            </div>
                          </td>

                          {/* Course Track */}
                          <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>
                            <div style={{ fontWeight: 600 }}>{intv.course_title}</div>
                          </td>

                          {/* How many minutes to complete the interview */}
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                color: '#e2e8f0',
                                fontWeight: 700,
                                background: 'rgba(255, 255, 255, 0.05)',
                                padding: '0.25rem 0.65rem',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '0.82rem',
                              }}
                            >
                              <Clock size={13} color="#38bdf8" />
                              <span>{intv.duration_minutes || 0} mins</span>
                            </div>
                          </td>

                          {/* Interview Score */}
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '9999px',
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                background: isHigh ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                                color: isHigh ? '#10b981' : '#f43f5e',
                                border: isHigh ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(244, 63, 94, 0.3)',
                              }}
                            >
                              <span>{intv.interview_score}%</span>
                            </div>
                          </td>

                          {/* Hiring Verdict */}
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                            <span
                              style={{
                                padding: '0.25rem 0.65rem',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                background:
                                  intv.hiring_verdict?.toLowerCase().includes('hire') || intv.hiring_verdict?.toLowerCase().includes('strong') || isHigh
                                    ? 'rgba(16, 185, 129, 0.15)'
                                    : 'rgba(245, 158, 11, 0.15)',
                                color:
                                  intv.hiring_verdict?.toLowerCase().includes('hire') || intv.hiring_verdict?.toLowerCase().includes('strong') || isHigh
                                    ? '#10b981'
                                    : '#fcd34d',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                              }}
                            >
                              {intv.hiring_verdict || 'Evaluation Complete'}
                            </span>
                          </td>

                          {/* Status */}
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                            <span
                              style={{
                                textTransform: 'capitalize',
                                fontSize: '0.78rem',
                                color: intv.status === 'completed' ? '#38bdf8' : '#fcd34d',
                                fontWeight: 600,
                              }}
                            >
                              {intv.status}
                            </span>
                          </td>

                          {/* View Detailed Scorecard */}
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => setSelectedInterviewModal(intv)}
                              className="btn btn-secondary btn-sm"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                fontSize: '0.78rem',
                                color: '#38bdf8',
                                borderColor: 'rgba(56, 189, 248, 0.4)',
                              }}
                            >
                              <span>View Report</span>
                              <ChevronRight size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Modal: Detailed Interview Report Scorecard */}
      {selectedInterviewModal && (
        <Modal
          isOpen={Boolean(selectedInterviewModal)}
          onClose={() => setSelectedInterviewModal(null)}
          title={`AI Interview Report: ${selectedInterviewModal.candidate_name}`}
          maxWidth="700px"
        >
          <div>
            {/* Header Banner */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                marginBottom: '1.25rem',
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>
                  {selectedInterviewModal.candidate_name}
                </div>
                <div style={{ color: '#38bdf8', fontSize: '0.85rem' }}>{selectedInterviewModal.candidate_email}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px' }}>
                  Course: <strong style={{ color: '#fff' }}>{selectedInterviewModal.course_title}</strong>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981' }}>
                  {selectedInterviewModal.interview_score}%
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Duration: {selectedInterviewModal.duration_minutes} mins
                </div>
              </div>
            </div>

            {/* Scorecard Competencies */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.75rem',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.85rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Technical</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
                  {selectedInterviewModal.technical_score}%
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.85rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Communication</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#c084fc', marginTop: '4px' }}>
                  {selectedInterviewModal.communication_score}%
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.85rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Problem Solving</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                  {selectedInterviewModal.problem_solving_score}%
                </div>
              </div>
            </div>

            {/* Executive Summary */}
            {selectedInterviewModal.executive_summary && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.35rem' }}>
                  AI Executive Evaluation Summary:
                </div>
                <div
                  style={{
                    padding: '0.85rem',
                    background: 'var(--bg-surface-elevated)',
                    borderRadius: 'var(--radius-md)',
                    color: '#cbd5e1',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                  }}
                >
                  {selectedInterviewModal.executive_summary}
                </div>
              </div>
            )}

            {/* Key Strengths & Growth Areas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#10b981', marginBottom: '0.35rem' }}>
                  Key Strengths:
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
                  {(selectedInterviewModal.key_strengths || []).map((s, idx) => (
                    <li key={idx} style={{ marginBottom: '3px' }}>{s}</li>
                  ))}
                  {(!selectedInterviewModal.key_strengths || selectedInterviewModal.key_strengths.length === 0) && (
                    <li>Demonstrated foundational readiness.</li>
                  )}
                </ul>
              </div>

              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.35rem' }}>
                  Growth Recommendations:
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
                  {(selectedInterviewModal.growth_recommendations || []).map((r, idx) => (
                    <li key={idx} style={{ marginBottom: '3px' }}>{r}</li>
                  ))}
                  {(!selectedInterviewModal.growth_recommendations || selectedInterviewModal.growth_recommendations.length === 0) && (
                    <li>Deepen real-time system architecture articulation.</li>
                  )}
                </ul>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <Button variant="secondary" onClick={() => setSelectedInterviewModal(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminReports;
