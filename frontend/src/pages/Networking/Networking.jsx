// frontend/src/pages/Networking/Networking.jsx
import React, { useState } from 'react';
import { Tabs, Tab, Box, Paper } from '@mui/material';
import ContactsTab from './ContactsTab';
import ReferralsTab from './ReferralsTab';
import EventsTab from './EventsTab';
import InformationalInterviewsTab from './InformationalInterviewsTab';
import DiscoveryTab from './DiscoveryTab';
import MaintenanceTab from './MaintenanceTab';
import ReferencesTab from './ReferencesTab';
import './Networking.css';

export default function Networking() {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const tabs = [
    { label: 'Contacts', component: ContactsTab },
    { label: 'Referrals', component: ReferralsTab },
    { label: 'Events', component: EventsTab },
    { label: 'Info Interviews', component: InformationalInterviewsTab },
    { label: 'Discovery', component: DiscoveryTab },
    { label: 'Maintenance', component: MaintenanceTab },
    { label: 'References', component: ReferencesTab },
  ];

  const CurrentComponent = tabs[currentTab].component;

  return (
    <div className="networking-page">
      <div className="networking-header">
        <h1>Professional Networking</h1>
        <p>Manage your professional network, track relationships, and leverage connections for career opportunities</p>
      </div>

      <Paper elevation={2} sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              minHeight: 64,
            },
          }}
        >
          {tabs.map((tab, index) => (
            <Tab key={index} label={tab.label} />
          ))}
        </Tabs>
      </Paper>

      <Box sx={{ mt: 3 }}>
        <CurrentComponent />
      </Box>
    </div>
  );
}

