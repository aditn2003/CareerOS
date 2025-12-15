import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Target,
  Plus,
  X,
  Edit,
  Save,
  Trash2,
  BarChart3
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import './CareerGrowthCalculator.css';

const CareerGrowthCalculator = () => {
  const [offers, setOffers] = useState([]);
  const [selectedOffers, setSelectedOffers] = useState([]);
  const [projections, setProjections] = useState({});
  const [milestones, setMilestones] = useState({}); // { offerId: [{ year, title, salary }] }
  const [scenarios, setScenarios] = useState({}); // { offerId: 'conservative' | 'expected' | 'optimistic' }
  const [startingSalaries, setStartingSalaries] = useState({}); // { offerId: number }
  const [annualRaises, setAnnualRaises] = useState({}); // { offerId: { conservative: 3, expected: 5, optimistic: 7 } }
  const [notes, setNotes] = useState({}); // { offerId: string }
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [newMilestones, setNewMilestones] = useState({}); // { offerId: { year: '', title: '', salary: '' } }

  useEffect(() => {
    fetchOffers();
  }, []);

  useEffect(() => {
    if (offers.length > 0 && selectedOffers.length > 0) {
      calculateProjections();
    }
  }, [offers, scenarios, milestones, startingSalaries, annualRaises, selectedOffers]);

  const fetchOffers = async () => {
    try {
      const response = await api.get('/api/offer-comparison/compare');
      const fetchedOffers = response.data.offers || [];
      setOffers(fetchedOffers);
      
      // Initialize selected offers (first 3 or all if less than 3)
      if (fetchedOffers.length > 0) {
        setSelectedOffers(fetchedOffers.slice(0, Math.min(3, fetchedOffers.length)).map(o => o.id));
      }

      // Initialize scenarios
      const initialScenarios = {};
      const initialStartingSalaries = {};
      const initialAnnualRaises = {};
      fetchedOffers.forEach(offer => {
        initialScenarios[offer.id] = 'expected';
        // Use offer's base salary as starting point, or compensation.base
        initialStartingSalaries[offer.id] = offer.base_salary || offer.compensation?.base || 0;
        // Default annual raises: 3%, 5%, 7%
        initialAnnualRaises[offer.id] = {
          conservative: 3,
          expected: 5,
          optimistic: 7
        };
      });
      setScenarios(initialScenarios);
      setStartingSalaries(initialStartingSalaries);
      setAnnualRaises(initialAnnualRaises);

      // Load saved milestones and notes from offers
      const initialMilestones = {};
      const initialNotes = {};
      fetchedOffers.forEach(offer => {
        // Try to get career_milestones from the offer object
        let careerMilestones = null;
        if (offer.career_milestones) {
          try {
            careerMilestones = typeof offer.career_milestones === 'string' 
              ? JSON.parse(offer.career_milestones)
              : offer.career_milestones;
          } catch (e) {
            console.warn('Error parsing career_milestones:', e);
            careerMilestones = [];
          }
        }
        initialMilestones[offer.id] = careerMilestones || [];
        initialNotes[offer.id] = offer.career_notes || '';
      });
      setMilestones(initialMilestones);
      setNotes(initialNotes);
    } catch (err) {
      console.error('Error fetching offers:', err);
    }
  };

  const calculateProjections = () => {
    const newProjections = {};
    
    if (selectedOffers.length === 0) {
      setProjections({});
      return;
    }
    
    selectedOffers.forEach(offerId => {
      const offer = offers.find(o => o.id === offerId);
      if (!offer) {
        console.warn(`Offer ${offerId} not found in offers array`);
        return;
      }

      // Use user-input starting salary, or fallback to offer's base salary
      const baseSalary = startingSalaries[offerId] || offer.base_salary || offer.compensation?.base || 0;
      if (!baseSalary || baseSalary === 0) {
        console.warn(`No base salary found for offer ${offerId} (${offer.company})`);
      }
      
      const scenario = scenarios[offerId] || 'expected';
      
      // Get annual raise percentage from user input or use defaults
      const offerRaises = annualRaises[offerId] || { conservative: 3, expected: 5, optimistic: 7 };
      const annualRaisePercent = offerRaises[scenario] || 5;
      const annualRaise = annualRaisePercent / 100; // Convert percentage to decimal
      
      const offerMilestones = milestones[offerId] || [];
      
      // Calculate projections for 10 years
      const projection = [];
      let currentSalary = baseSalary;
      
      for (let year = 0; year <= 10; year++) {
        // Check if there's a milestone at this year
        const milestone = offerMilestones.find(m => Math.floor(m.year) === year);
        
        if (milestone && milestone.salary) {
          currentSalary = parseFloat(milestone.salary);
        } else if (year > 0) {
          currentSalary = currentSalary * (1 + annualRaise);
        }
        
        projection.push({
          year,
          salary: Math.round(currentSalary),
          milestone: milestone ? milestone.title : null
        });
      }
      
      newProjections[offerId] = projection;
      console.log(`✅ Calculated projections for ${offer.company} (ID: ${offerId}):`, {
        baseSalary,
        scenario,
        annualRaisePercent,
        projectionLength: projection.length
      });
    });
    
    setProjections(newProjections);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleSelectOffer = (offerId) => {
    setSelectedOffers(prev => 
      prev.includes(offerId) 
        ? prev.filter(id => id !== offerId)
        : [...prev, offerId]
    );
  };

  const handleScenarioChange = (offerId, scenario) => {
    setScenarios(prev => ({
      ...prev,
      [offerId]: scenario
    }));
  };

  const handleAddMilestone = async (offerId) => {
    const currentMilestone = newMilestones[offerId] || { year: '', title: '', salary: '' };
    
    if (!currentMilestone.year || !currentMilestone.title || !currentMilestone.salary) {
      alert('Please fill in all milestone fields');
      return;
    }

    const milestone = {
      year: parseFloat(currentMilestone.year),
      title: currentMilestone.title,
      salary: parseFloat(currentMilestone.salary)
    };

    const updatedMilestones = {
      ...milestones,
      [offerId]: [...(milestones[offerId] || []), milestone].sort((a, b) => a.year - b.year)
    };

    setMilestones(updatedMilestones);
    await saveMilestones(offerId, updatedMilestones[offerId]);
    
    // Clear only this offer's milestone form
    setNewMilestones({
      ...newMilestones,
      [offerId]: { year: '', title: '', salary: '' }
    });
  };

  const handleDeleteMilestone = async (offerId, index) => {
    const updated = [...(milestones[offerId] || [])];
    updated.splice(index, 1);
    const updatedMilestones = {
      ...milestones,
      [offerId]: updated
    };
    setMilestones(updatedMilestones);
    await saveMilestones(offerId, updated);
  };

  const saveMilestones = async (offerId, milestoneData) => {
    try {
      await api.put(`/api/offer-comparison/${offerId}/career`, {
        milestones: milestoneData
      });
    } catch (err) {
      console.error('Error saving milestones:', err);
    }
  };

  const handleSaveNotes = async (offerId) => {
    try {
      await api.put(`/api/offer-comparison/${offerId}/career`, {
        notes: notes[offerId]
      });
    } catch (err) {
      console.error('Error saving notes:', err);
    }
  };

  // Prepare chart data
  const getChartData = () => {
    const chartData = [];
    
    for (let year = 0; year <= 10; year++) {
      const dataPoint = { year: year }; // Use number for X-axis, not string
      
      selectedOffers.forEach(offerId => {
        const offer = offers.find(o => o.id === offerId);
        if (!offer) return;
        
        const projection = projections[offerId];
        if (projection && projection[year]) {
          // Use shorter keys for cleaner legend
          const companyKey = offer.company.replace(/\s+/g, ''); // Remove spaces
          dataPoint[`${companyKey}_salary`] = projection[year].salary;
        }
      });
      
      chartData.push(dataPoint);
    }
    
    return chartData;
  };

  const chartData = getChartData();
  const displayOffers = offers.filter(o => selectedOffers.includes(o.id));

  return (
    <div className="career-growth-calculator">
      <div className="calculator-header">
        <h1>
          <TrendingUp size={24} />
          Career Growth Calculator
        </h1>
        <p className="subtitle">Project and compare salary growth trajectories for your job offers</p>
      </div>

      {/* Offer Selection */}
      <div className="offer-selection-card">
        <h2>Select Offers to Compare</h2>
        <div className="offer-checkboxes">
          {offers.map(offer => (
            <label key={offer.id} className="offer-checkbox-label">
              <input
                type="checkbox"
                checked={selectedOffers.includes(offer.id)}
                onChange={() => handleSelectOffer(offer.id)}
              />
              <span>{offer.company}</span>
              <span className="offer-salary-preview">
                {formatCurrency(offer.compensation?.base || offer.base_salary || 0)}
              </span>
            </label>
          ))}
        </div>
      </div>

      {displayOffers.length === 0 ? (
        <div className="empty-state">
          <BarChart3 size={48} />
          <p>Select at least one offer to view career growth projections</p>
        </div>
      ) : (
        <>
          {/* Growth Projections Chart */}
          <div className="projection-chart-card">
            <h2>Salary Growth Trajectory (10 Years)</h2>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="year" 
                    label={{ value: 'Year', position: 'insideBottom', offset: -10 }}
                    tickFormatter={(value) => `Y${value}`}
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    label={{ value: 'Compensation', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value, name) => [formatCurrency(value), name]}
                    labelFormatter={(label) => `Year ${label}`}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="line"
                    formatter={(value) => {
                      // Format legend labels: "CompanyName_salary" -> "CompanyName"
                      const parts = value.split('_');
                      if (parts.length === 2) {
                        const company = parts[0];
                        return company;
                      }
                      return value;
                    }}
                  />
                  {displayOffers.map((offer, index) => {
                    const companyKey = offer.company.replace(/\s+/g, '');
                    const color = `hsl(${(index * 60) % 360}, 70%, 50%)`; // Better color distribution
                    
                    return (
                      <Line
                        key={offer.id}
                        type="monotone"
                        dataKey={`${companyKey}_salary`}
                        stroke={color}
                        strokeWidth={3}
                        dot={{ r: 5 }}
                        activeDot={{ r: 7 }}
                        name={`${companyKey}_salary`}
                        connectNulls={false}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Projection Details for Each Offer */}
          <div className="projections-grid">
            {displayOffers.map(offer => {
              const projection = projections[offer.id] || [];
              const offerMilestones = milestones[offer.id] || [];
              const scenario = scenarios[offer.id] || 'expected';
              
              return (
                <div key={offer.id} className="projection-card">
                  <div className="projection-header">
                    <h3>{offer.company}</h3>
                    <div className="scenario-selector">
                      <label>Scenario:</label>
                      <select
                        value={scenario}
                        onChange={(e) => handleScenarioChange(offer.id, e.target.value)}
                      >
                        <option value="conservative">Conservative ({annualRaises[offer.id]?.conservative || 3}%)</option>
                        <option value="expected">Expected ({annualRaises[offer.id]?.expected || 5}%)</option>
                        <option value="optimistic">Optimistic ({annualRaises[offer.id]?.optimistic || 7}%)</option>
                      </select>
                    </div>
                  </div>

                  {/* Starting Salary Input */}
                  <div className="starting-salary-section">
                    <label className="input-label">
                      <DollarSign size={16} />
                      Starting Salary
                    </label>
                    <div className="salary-input-group">
                      <span className="currency-symbol">$</span>
                      <input
                        type="number"
                        value={startingSalaries[offer.id] || offer.base_salary || offer.compensation?.base || 0}
                        onChange={(e) => setStartingSalaries({
                          ...startingSalaries,
                          [offer.id]: parseFloat(e.target.value) || 0
                        })}
                        className="salary-input"
                        min="0"
                        step="1000"
                      />
                    </div>
                  </div>

                  {/* Annual Raise Inputs */}
                  <div className="annual-raise-section">
                    <label className="input-label">
                      <TrendingUp size={16} />
                      Annual Raise Percentages
                    </label>
                    <div className="raise-inputs-grid">
                      <div className="raise-input-item">
                        <label>Conservative:</label>
                        <div className="raise-input-group">
                          <input
                            type="number"
                            value={annualRaises[offer.id]?.conservative || 3}
                            onChange={(e) => setAnnualRaises({
                              ...annualRaises,
                              [offer.id]: {
                                ...(annualRaises[offer.id] || { expected: 5, optimistic: 7 }),
                                conservative: parseFloat(e.target.value) || 3
                              }
                            })}
                            className="raise-input"
                            min="0"
                            max="20"
                            step="0.1"
                          />
                          <span className="percent-symbol">%</span>
                        </div>
                      </div>
                      <div className="raise-input-item">
                        <label>Expected:</label>
                        <div className="raise-input-group">
                          <input
                            type="number"
                            value={annualRaises[offer.id]?.expected || 5}
                            onChange={(e) => setAnnualRaises({
                              ...annualRaises,
                              [offer.id]: {
                                ...(annualRaises[offer.id] || { conservative: 3, optimistic: 7 }),
                                expected: parseFloat(e.target.value) || 5
                              }
                            })}
                            className="raise-input"
                            min="0"
                            max="20"
                            step="0.1"
                          />
                          <span className="percent-symbol">%</span>
                        </div>
                      </div>
                      <div className="raise-input-item">
                        <label>Optimistic:</label>
                        <div className="raise-input-group">
                          <input
                            type="number"
                            value={annualRaises[offer.id]?.optimistic || 7}
                            onChange={(e) => setAnnualRaises({
                              ...annualRaises,
                              [offer.id]: {
                                ...(annualRaises[offer.id] || { conservative: 3, expected: 5 }),
                                optimistic: parseFloat(e.target.value) || 7
                              }
                            })}
                            className="raise-input"
                            min="0"
                            max="20"
                            step="0.1"
                          />
                          <span className="percent-symbol">%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5 and 10 Year Projections */}
                  <div className="projection-summary">
                    <div className="summary-item">
                      <span className="summary-label">5 Year Salary:</span>
                      <span className="summary-value highlight">
                        {projection[5] ? formatCurrency(projection[5].salary) : 'N/A'}
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">10 Year Salary:</span>
                      <span className="summary-value highlight">
                        {projection[10] ? formatCurrency(projection[10].salary) : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Career Milestones */}
                  <div className="milestones-section">
                    <h4>
                      <Target size={16} />
                      Career Milestones
                    </h4>
                    <div className="milestones-list">
                      {offerMilestones.map((milestone, idx) => (
                        <div key={idx} className="milestone-item">
                          <div className="milestone-info">
                            <span className="milestone-year">Year {milestone.year}</span>
                            <span className="milestone-title">{milestone.title}</span>
                            <span className="milestone-salary">{formatCurrency(milestone.salary)}</span>
                          </div>
                          <button
                            className="delete-milestone-btn"
                            onClick={() => handleDeleteMilestone(offer.id, idx)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    {/* Add Milestone Form */}
                    <div className="add-milestone-form">
                      <input
                        type="number"
                        placeholder="Year"
                        min="0"
                        max="10"
                        step="0.5"
                        value={newMilestones[offer.id]?.year || ''}
                        onChange={(e) => setNewMilestones({
                          ...newMilestones,
                          [offer.id]: {
                            ...(newMilestones[offer.id] || { title: '', salary: '' }),
                            year: e.target.value
                          }
                        })}
                        className="milestone-input"
                      />
                      <input
                        type="text"
                        placeholder="Title (e.g., Senior Engineer)"
                        value={newMilestones[offer.id]?.title || ''}
                        onChange={(e) => setNewMilestones({
                          ...newMilestones,
                          [offer.id]: {
                            ...(newMilestones[offer.id] || { year: '', salary: '' }),
                            title: e.target.value
                          }
                        })}
                        className="milestone-input"
                      />
                      <input
                        type="number"
                        placeholder="Salary"
                        value={newMilestones[offer.id]?.salary || ''}
                        onChange={(e) => setNewMilestones({
                          ...newMilestones,
                          [offer.id]: {
                            ...(newMilestones[offer.id] || { year: '', title: '' }),
                            salary: e.target.value
                          }
                        })}
                        className="milestone-input"
                      />
                      <button
                        className="add-milestone-btn"
                        onClick={() => handleAddMilestone(offer.id)}
                      >
                        <Plus size={16} />
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Career Notes */}
                  <div className="notes-section">
                    <h4>
                      <Calendar size={16} />
                      Career Goals & Notes
                    </h4>
                    <textarea
                      value={notes[offer.id] || ''}
                      onChange={(e) => setNotes({ ...notes, [offer.id]: e.target.value })}
                      placeholder="Add notes about non-financial career goals, learning opportunities, work-life balance priorities, etc."
                      className="career-notes-input"
                      rows={4}
                    />
                    <button
                      className="save-notes-btn"
                      onClick={() => handleSaveNotes(offer.id)}
                    >
                      <Save size={16} />
                      Save Notes
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default CareerGrowthCalculator;

