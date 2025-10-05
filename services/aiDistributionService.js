import { query } from '../db.js';

class AIDistributionService {
  constructor() {
    this.DEFAULT_DAILY_LIMIT = 7;
    this.CRITICAL_PRIORITY_ITEMS = ['food', 'medicine', 'medical', 'urgent'];
  }

  // Get NGO daily limits and usage
  async getNGODailyLimits(ngoId, date = new Date().toISOString().split('T')[0]) {
    try {
      const result = await query(`
        SELECT 
          ndl.*,
          np.volunteer_count,
          np.rating,
          np.city_coverage_percentage,
          np.avg_approval_time_hours,
          np.avg_delivery_time_hours
        FROM ngo_daily_limits ndl
        LEFT JOIN ngo_performance np ON ndl.ngo_id = np.ngo_id
        WHERE ndl.ngo_id = ? AND ndl.date = ?
      `, [ngoId, date]);

      if (result && result.length > 0) {
        return result[0];
      }

      // Create new daily limit record if doesn't exist
      return await this.createDailyLimit(ngoId, date);
    } catch (error) {
      console.error('Error getting NGO daily limits:', error);
      return null;
    }
  }

  // Create new daily limit record
  async createDailyLimit(ngoId, date) {
    try {
      // Get NGO performance to determine appropriate limit
      const performanceResult = await query(`
        SELECT volunteer_count, rating FROM ngo_performance WHERE ngo_id = ?
      `, [ngoId]);

      let dailyLimit = this.DEFAULT_DAILY_LIMIT;
      if (performanceResult && performanceResult.length > 0) {
        const performance = performanceResult[0];
        // Adjust limit based on volunteer count and rating
        if (performance.volunteer_count >= 5 && performance.rating >= 4.5) {
          dailyLimit = 8; // High-performing NGOs get more requests
        } else if (performance.volunteer_count >= 3 && performance.rating >= 4.0) {
          dailyLimit = 7; // Standard limit
        } else {
          dailyLimit = 5; // Lower limit for smaller/less experienced NGOs
        }
      }

      const result = await query(`
        INSERT INTO ngo_daily_limits (ngo_id, date, daily_limit, performance_score, load_level)
        VALUES (?, ?, ?, 5.00, 'medium')
      `, [ngoId, date, dailyLimit]);

      return {
        id: result.insertId,
        ngo_id: ngoId,
        date: date,
        daily_limit: dailyLimit,
        approvals_used: 0,
        critical_approvals: 0,
        performance_score: 5.00,
        load_level: 'medium'
      };
    } catch (error) {
      console.error('Error creating daily limit:', error);
      return null;
    }
  }

  // Check if NGO can approve more requests
  async canApproveRequest(ngoId, donationId, date = new Date().toISOString().split('T')[0]) {
    try {
      const limits = await this.getNGODailyLimits(ngoId, date);
      if (!limits) {
        // If no limits found, create default limits and allow approval
        const defaultLimits = await this.createDailyLimit(ngoId, date);
        if (!defaultLimits) return { canApprove: true, reason: 'Default limits created' };
        limits = defaultLimits;
      }

      // Get donation priority
      const donationResult = await query(`
        SELECT priority, books, clothes, grains, footwear, toys, school_supplies, description
        FROM donations WHERE id = ?
      `, [donationId]);

      if (!donationResult || donationResult.length === 0) {
        return { canApprove: false, reason: 'Donation not found' };
      }

      const donation = donationResult[0];
      const isCritical = this.isCriticalPriority(donation);

      // Critical items don't count toward daily limit
      if (isCritical) {
        return { 
          canApprove: true, 
          reason: 'Critical priority - no limit applied',
          isCritical: true
        };
      }

      // Check if NGO has reached daily limit
      if (limits.approvals_used >= limits.daily_limit) {
        return { 
          canApprove: false, 
          reason: `Daily limit reached (${limits.approvals_used}/${limits.daily_limit})`,
          remaining: 0
        };
      }

      return { 
        canApprove: true, 
        reason: 'Within daily limits',
        remaining: limits.daily_limit - limits.approvals_used,
        isCritical: false
      };
    } catch (error) {
      console.error('Error checking approval eligibility:', error);
      return { canApprove: false, reason: 'System error' };
    }
  }

  // Check if donation is critical priority
  isCriticalPriority(donation) {
    const description = (donation.description || '').toLowerCase();
    const priority = (donation.priority || '').toLowerCase();
    
    // Check priority level
    if (priority === 'critical') return true;
    
    // Check for critical items
    if (donation.grains > 0 || donation.books > 0) {
      // Food items (grains) are always critical
      if (donation.grains > 0) return true;
    }
    
    // Check description for critical keywords
    return this.CRITICAL_PRIORITY_ITEMS.some(keyword => 
      description.includes(keyword)
    );
  }

  // Record NGO approval
  async recordApproval(ngoId, donationId, date = new Date().toISOString().split('T')[0]) {
    try {
      const limits = await this.getNGODailyLimits(ngoId, date);
      if (!limits) return false;

      const donationResult = await query(`
        SELECT priority, books, clothes, grains, footwear, toys, school_supplies, description
        FROM donations WHERE id = ?
      `, [donationId]);

      if (!donationResult || donationResult.length === 0) return false;

      const donation = donationResult[0];
      const isCritical = this.isCriticalPriority(donation);

      // Update daily limits
      if (isCritical) {
        await query(`
          UPDATE ngo_daily_limits 
          SET critical_approvals = critical_approvals + 1 
          WHERE ngo_id = ? AND date = ?
        `, [ngoId, date]);
      } else {
        await query(`
          UPDATE ngo_daily_limits 
          SET approvals_used = approvals_used + 1 
          WHERE ngo_id = ? AND date = ?
        `, [ngoId, date]);
      }

      // Update performance metrics
      await this.updatePerformanceMetrics(ngoId);

      return true;
    } catch (error) {
      console.error('Error recording approval:', error);
      return false;
    }
  }

  // Update NGO performance metrics
  async updatePerformanceMetrics(ngoId) {
    try {
      // Calculate performance metrics
      const metricsResult = await query(`
        SELECT 
          COUNT(*) as total_approvals,
          AVG(TIMESTAMPDIFF(HOUR, d.created_at, d.assigned_at)) as avg_approval_time,
          AVG(TIMESTAMPDIFF(HOUR, d.assigned_at, NOW())) as avg_delivery_time,
          COUNT(CASE WHEN d.status = 'delivered' THEN 1 END) as total_deliveries
        FROM donations d
        WHERE d.ngo_id = ? AND d.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `, [ngoId]);

      const volunteerCountResult = await query(`
        SELECT COUNT(*) as volunteer_count FROM volunteers WHERE ngo_id = ?
      `, [ngoId]);

      const cityCoverageResult = await query(`
        SELECT 
          n.city,
          COUNT(DISTINCT d.ngo_id) as total_ngos,
          COUNT(CASE WHEN d.ngo_id = ? THEN 1 END) as ngo_approvals,
          COUNT(*) as total_approvals
        FROM donations d
        JOIN ngo_register n ON d.ngo_id = n.id
        WHERE d.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        AND n.city = (SELECT city FROM ngo_register WHERE id = ?)
        GROUP BY n.city
      `, [ngoId, ngoId]);

      const metrics = metricsResult && metricsResult[0] ? metricsResult[0] : {};
      const volunteerCount = volunteerCountResult && volunteerCountResult[0] ? volunteerCountResult[0].volunteer_count : 0;
      const cityCoverage = cityCoverageResult && cityCoverageResult[0] ? cityCoverageResult[0] : {};

      // Calculate coverage percentage
      const coveragePercentage = cityCoverage.total_approvals > 0 
        ? (cityCoverage.ngo_approvals / cityCoverage.total_approvals) * 100 
        : 0;

      // Calculate performance rating (0-5 scale)
      let rating = 5.0;
      if (metrics.avg_approval_time > 24) rating -= 1.0; // Slow approval
      if (metrics.avg_delivery_time > 72) rating -= 1.0; // Slow delivery
      if (coveragePercentage < 20) rating -= 0.5; // Low coverage
      rating = Math.max(0, Math.min(5, rating));

      // Update performance record
      await query(`
        INSERT INTO ngo_performance (
          ngo_id, total_approvals, total_deliveries, 
          avg_approval_time_hours, avg_delivery_time_hours,
          volunteer_count, city_coverage_percentage, rating
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          total_approvals = VALUES(total_approvals),
          total_deliveries = VALUES(total_deliveries),
          avg_approval_time_hours = VALUES(avg_approval_time_hours),
          avg_delivery_time_hours = VALUES(avg_delivery_time_hours),
          volunteer_count = VALUES(volunteer_count),
          city_coverage_percentage = VALUES(city_coverage_percentage),
          rating = VALUES(rating),
          last_updated = CURRENT_TIMESTAMP
      `, [
        ngoId,
        metrics.total_approvals || 0,
        metrics.total_deliveries || 0,
        metrics.avg_approval_time || 0,
        metrics.avg_delivery_time || 0,
        volunteerCount,
        coveragePercentage,
        rating
      ]);

      return true;
    } catch (error) {
      console.error('Error updating performance metrics:', error);
      return false;
    }
  }

  // Get city coverage analytics
  async getCityCoverage(city, date = new Date().toISOString().split('T')[0]) {
    try {
      const result = await query(`
        SELECT 
          cca.*,
          COUNT(DISTINCT n.id) as total_ngos,
          COUNT(DISTINCT CASE WHEN n.verification_status = 'approved' THEN n.id END) as active_ngos
        FROM city_coverage_analytics cca
        LEFT JOIN ngo_register n ON n.city = cca.city
        WHERE cca.city = ? AND cca.date = ?
        GROUP BY cca.id
      `, [city, date]);

      if (result && result.length > 0) {
        return result[0];
      }

      // Create new city coverage record
      return await this.createCityCoverage(city, date);
    } catch (error) {
      console.error('Error getting city coverage:', error);
      return null;
    }
  }

  // Create city coverage record
  async createCityCoverage(city, date) {
    try {
      const statsResult = await query(`
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN ngo_approval_status = 'approved' THEN 1 END) as approved_requests,
          COUNT(CASE WHEN ngo_approval_status = 'pending' THEN 1 END) as pending_requests
        FROM donations 
        WHERE city = ? AND DATE(created_at) = ?
      `, [city, date]);

      const ngoCountResult = await query(`
        SELECT 
          COUNT(*) as total_ngos,
          COUNT(CASE WHEN verification_status = 'approved' THEN 1 END) as active_ngos
        FROM ngo_register 
        WHERE city = ?
      `, [city]);

      const stats = statsResult && statsResult[0] ? statsResult[0] : {};
      const ngoCount = ngoCountResult && ngoCountResult[0] ? ngoCountResult[0] : {};

      const coveragePercentage = stats.total_requests > 0 
        ? (stats.approved_requests / stats.total_requests) * 100 
        : 0;

      const result = await query(`
        INSERT INTO city_coverage_analytics (
          city, total_ngos, active_ngos, total_requests_today,
          approved_requests_today, pending_requests_today, coverage_percentage, date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        city,
        ngoCount.total_ngos || 0,
        ngoCount.active_ngos || 0,
        stats.total_requests || 0,
        stats.approved_requests || 0,
        stats.pending_requests || 0,
        coveragePercentage,
        date
      ]);

      return {
        id: result.insertId,
        city: city,
        total_ngos: ngoCount.total_ngos || 0,
        active_ngos: ngoCount.active_ngos || 0,
        total_requests_today: stats.total_requests || 0,
        approved_requests_today: stats.approved_requests || 0,
        pending_requests_today: stats.pending_requests || 0,
        coverage_percentage: coveragePercentage,
        date: date
      };
    } catch (error) {
      console.error('Error creating city coverage:', error);
      return null;
    }
  }

  // Get AI suggestions for donation distribution
  async getDistributionSuggestions(donationId) {
    try {
      const donationResult = await query(`
        SELECT d.*, u.fullname as donor_name
        FROM donations d
        LEFT JOIN users u ON d.user_id = u.id
        WHERE d.id = ?
      `, [donationId]);

      if (!donationResult || donationResult.length === 0) {
        return [];
      }

      const donation = donationResult[0];
      const isCritical = this.isCriticalPriority(donation);

      // Get NGOs in the same city with available capacity
      const ngoResult = await query(`
        SELECT 
          n.*,
          ndl.daily_limit,
          ndl.approvals_used,
          ndl.critical_approvals,
          np.volunteer_count,
          np.rating,
          np.city_coverage_percentage,
          (ndl.daily_limit - ndl.approvals_used) as remaining_capacity,
          CASE 
            WHEN ? = 1 THEN 1.0  -- Critical items get highest priority
            WHEN np.rating >= 4.5 THEN 0.9
            WHEN np.rating >= 4.0 THEN 0.8
            WHEN np.rating >= 3.5 THEN 0.7
            ELSE 0.6
          END as priority_score
        FROM ngo_register n
        LEFT JOIN ngo_daily_limits ndl ON n.id = ndl.ngo_id AND ndl.date = CURDATE()
        LEFT JOIN ngo_performance np ON n.id = np.ngo_id
        WHERE n.city = ? 
          AND n.verification_status = 'approved'
          AND (ndl.approvals_used < ndl.daily_limit OR ? = 1)
        ORDER BY priority_score DESC, np.volunteer_count DESC, np.rating DESC
        LIMIT 5
      `, [isCritical ? 1 : 0, donation.city, isCritical ? 1 : 0]);

      const suggestions = [];
      if (ngoResult) {
        ngoResult.forEach((ngo, index) => {
          let reason = 'capacity';
          let confidence = 0.5;

          if (isCritical) {
            reason = 'priority';
            confidence = 0.9;
          } else if (ngo.rating >= 4.5) {
            reason = 'performance';
            confidence = 0.8;
          } else if (ngo.volunteer_count >= 5) {
            reason = 'capacity';
            confidence = 0.7;
          }

          suggestions.push({
            ngo_id: ngo.id,
            ngo_name: ngo.ngo_name,
            reason: reason,
            confidence_score: confidence,
            remaining_capacity: ngo.remaining_capacity,
            volunteer_count: ngo.volunteer_count,
            rating: ngo.rating
          });
        });
      }

      return suggestions;
    } catch (error) {
      console.error('Error getting distribution suggestions:', error);
      return [];
    }
  }

  // Get load balancing recommendations
  async getLoadBalancingRecommendations(city) {
    try {
      const result = await query(`
        SELECT 
          n.id,
          n.ngo_name,
          ndl.daily_limit,
          ndl.approvals_used,
          ndl.critical_approvals,
          np.volunteer_count,
          np.rating,
          np.city_coverage_percentage,
          (ndl.daily_limit - ndl.approvals_used) as remaining_capacity,
          CASE 
            WHEN (ndl.daily_limit - ndl.approvals_used) >= 5 THEN 'low'
            WHEN (ndl.daily_limit - ndl.approvals_used) >= 2 THEN 'medium'
            ELSE 'high'
          END as load_level
        FROM ngo_register n
        LEFT JOIN ngo_daily_limits ndl ON n.id = ndl.ngo_id AND ndl.date = CURDATE()
        LEFT JOIN ngo_performance np ON n.id = np.ngo_id
        WHERE n.city = ? AND n.verification_status = 'approved'
        ORDER BY remaining_capacity DESC, np.rating DESC
      `, [city]);

      return result || [];
    } catch (error) {
      console.error('Error getting load balancing recommendations:', error);
      return [];
    }
  }
}

export default new AIDistributionService();
