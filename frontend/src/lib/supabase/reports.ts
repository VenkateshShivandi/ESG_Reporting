import { createClient } from "@supabase/supabase-js"
import * as Sentry from "@sentry/nextjs"

// Define a type for reports
export interface Report {
  id: string;
  name: string;
  type: string;
  timestamp: Date;
  files: string[];
  status?: string;
  generated_at?: string;
  scheduled_for?: string;
  metrics?: {
    environmental_score?: number;
    social_score?: number;
    governance_score?: number;
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Save a report to Supabase
 */
export async function saveReport(report: Report): Promise<{ success: boolean, error?: any }> {
  try {
    console.log(`📊 Saving report to Supabase: ${report.name}`)
    
    // Convert the Report object to a format suitable for Supabase
    const supabaseReport = {
      id: report.id,
      name: report.name,
      type: report.type,
      created_at: report.timestamp.toISOString(),
      files: report.files,
      status: report.status || 'completed',
      generated_at: report.generated_at || report.timestamp.toISOString(),
      scheduled_for: report.scheduled_for || null,
      metrics: report.metrics || null
    }
    
    // Insert the report into the reports table
    const { error } = await supabase
      .from('reports')
      .insert(supabaseReport)
    
    if (error) {
      console.error(`❌ Error saving report:`, error)
      Sentry.captureException(error)
      return { success: false, error }
    }
    
    console.log(`✅ Report saved successfully: ${report.name}`)
    return { success: true }
  } catch (error) {
    console.error(`❌ Unexpected error saving report:`, error)
    Sentry.captureException(error)
    return { success: false, error }
  }
}

/**
 * Fetch all reports from Supabase
 */
export async function fetchReports(): Promise<{ reports: Report[], error?: any }> {
  try {
    console.log(`🔍 Fetching reports from Supabase`)
    
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error(`❌ Error fetching reports:`, error)
      Sentry.captureException(error)
      return { reports: [], error }
    }
    
    if (!data) {
      console.log(`ℹ️ No reports found`)
      return { reports: [] }
    }
    
    // Convert the Supabase data to Report objects
    const reports: Report[] = data.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      timestamp: new Date(item.created_at),
      files: item.files || [],
      status: item.status,
      generated_at: item.generated_at,
      scheduled_for: item.scheduled_for,
      metrics: item.metrics
    }))
    
    console.log(`✅ Fetched ${reports.length} reports`)
    return { reports }
  } catch (error) {
    console.error(`❌ Unexpected error fetching reports:`, error)
    Sentry.captureException(error)
    return { reports: [], error }
  }
}

/**
 * Delete a report from Supabase
 */
export async function deleteReport(reportId: string): Promise<{ success: boolean, error?: any }> {
  try {
    console.log(`🗑️ Deleting report: ${reportId}`)
    
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId)
    
    if (error) {
      console.error(`❌ Error deleting report:`, error)
      Sentry.captureException(error)
      return { success: false, error }
    }
    
    console.log(`✅ Report deleted successfully: ${reportId}`)
    return { success: true }
  } catch (error) {
    console.error(`❌ Unexpected error deleting report:`, error)
    Sentry.captureException(error)
    return { success: false, error }
  }
}

/**
 * Schedule a report for future generation
 */
export async function scheduleReport(
  reportName: string, 
  reportType: string, 
  scheduledDate: Date,
  fileIds: string[] = []
): Promise<{ success: boolean, reportId?: string, error?: any }> {
  try {
    console.log(`📅 Scheduling report: ${reportName} for ${scheduledDate.toISOString()}`)
    
    const reportId = `scheduled-${Date.now()}`
    
    const scheduledReport = {
      id: reportId,
      name: reportName,
      type: reportType,
      created_at: new Date().toISOString(),
      scheduled_for: scheduledDate.toISOString(),
      status: 'scheduled',
      files: fileIds
    }
    
    const { error } = await supabase
      .from('reports')
      .insert(scheduledReport)
    
    if (error) {
      console.error(`❌ Error scheduling report:`, error)
      Sentry.captureException(error)
      return { success: false, error }
    }
    
    console.log(`✅ Report scheduled successfully: ${reportId}`)
    return { success: true, reportId }
  } catch (error) {
    console.error(`❌ Unexpected error scheduling report:`, error)
    Sentry.captureException(error)
    return { success: false, error }
  }
}

/**
 * Get a single report by ID
 */
export async function getReportById(reportId: string): Promise<{ report?: Report, error?: any }> {
  try {
    console.log(`🔍 Fetching report: ${reportId}`)
    
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single()
    
    if (error) {
      console.error(`❌ Error fetching report:`, error)
      Sentry.captureException(error)
      return { error }
    }
    
    if (!data) {
      console.log(`ℹ️ Report not found: ${reportId}`)
      return { error: new Error('Report not found') }
    }
    
    const report: Report = {
      id: data.id,
      name: data.name,
      type: data.type,
      timestamp: new Date(data.created_at),
      files: data.files || [],
      status: data.status,
      generated_at: data.generated_at,
      scheduled_for: data.scheduled_for,
      metrics: data.metrics
    }
    
    console.log(`✅ Fetched report: ${report.name}`)
    return { report }
  } catch (error) {
    console.error(`❌ Unexpected error fetching report:`, error)
    Sentry.captureException(error)
    return { error }
  }
} 