import { type Simulation } from "../domain/Simulation"

const SERVER_URL = '/api/simulations/';
export const GetSimulations = async () : Promise<Simulation[]> => {
    try {

        const response = await fetch(SERVER_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        console.log(data);

        return data as Simulation[];

    } catch (oException) {
        throw new Error(`HTTP error exception handled! status: ${oException}`);
    }
}