import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container
} from '@mui/material';
import {
  Add as AddIcon,
} from '@mui/icons-material';
import { gridStyles } from '../Converts'
import './SimulationsList.css';
import { type Simulation } from '../../domain/Simulation'
import { SimulationCard } from '../../cards/SimulationCard/SimulationCard'
import { SimulationsCountPanel } from '../../molecules/SimulationsCountPanel'
import { AcceptDeleteSimulation } from '../../dialogs/AcceptDeleteSimulation/AcceptDeleteSimulation'
import { GetSimulations } from '../../api/Simulations';

const SimulationManager: React.FC = () => {
  // Начальные данные
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [openDeleteDialog, setDeleteDialog] = useState(false);
  const [selectedSimulation, setSelectedSimulation] = useState<Simulation | null>(null);

  useEffect(() => {
  const fetchSimulations = async () => {
    const data = await GetSimulations();
    setSimulations(data);
  };

    fetchSimulations();
  }, []); // Пустой массив зависимостей = выполнить один раз при монтировании

  // Обработчики действий
  const handleOpenSimulation = () => {//id: number) => {
    alert('Пока не реализовано');
  };

  const handleStopSimulation = () => {//id: number) => {
    alert('Пока не реализовано');
  };

  const handleDeleteClick = (simulation: Simulation) => {
    setSelectedSimulation(simulation);
    setDeleteDialog(true)
  };

  const deleteSimulation = (simulationId: number) => {
    setSimulations(simulations.filter(sim => sim.id != simulationId));
    setDeleteDialog(false)
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>

      <SimulationsCountPanel simulations={simulations} />

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => {}}
        className="create-simulation-btn">
        Создать новую модель
      </Button>

      <Box sx={gridStyles}>
        {simulations.map((simulation) => (
          <SimulationCard
            key={simulation.id}
            simulation={simulation}
            onOpen={handleOpenSimulation}
            onStop={handleStopSimulation}
            onDelete={handleDeleteClick}
          />
        ))}
      </Box>

      {/* Диалог подтверждения удаления */}
      {
        selectedSimulation &&
          <AcceptDeleteSimulation
            isOpen={openDeleteDialog}
            setOpen={setDeleteDialog}
            simulationId={selectedSimulation?.id}
            simulationName={selectedSimulation?.name}
            onAccept={deleteSimulation} />
      }

    </Container>
  );
};

export default SimulationManager;