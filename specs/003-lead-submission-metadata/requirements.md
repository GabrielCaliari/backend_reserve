# Requirements: Lead Submission Metadata Tracking

**Feature ID**: 003  
**Feature Name**: Lead Submission Metadata Tracking  
**Created**: 2026-02-16  
**Status**: Draft

## Problem Statement

Currently, when leads are captured through collection endpoints, we only store the lead's contact information and basic data. We lack visibility into:
- Where the lead came from (IP address, geolocation)
- What device/browser they used (user agent details)
- Technical context of the submission (route, referrer)

This metadata is crucial for:
- Fraud detection and spam prevention
- Marketing attribution and analytics
- Understanding lead quality by geography
- Debugging submission issues
- Compliance with data retention policies

## User Stories

### US1: Automatic Metadata Capture on Lead Submission (Priority: P1)

**As a** system administrator  
**I want** lead submission metadata to be automatically captured and stored  
**So that** we have a complete audit trail of every lead submission

**Acceptance Criteria:**
1. When a lead is submitted via `/collect/:slug`, the system captures IP address from the request
2. The system captures full user agent string from request headers
3. The system captures the route/path where the submission occurred
4. The system captures referrer URL if available
5. All metadata is stored in a new `LeadSubmission` table linked to the lead
6. Metadata capture never blocks or fails the lead submission (graceful degradation)
7. If metadata capture fails, the lead is still created s