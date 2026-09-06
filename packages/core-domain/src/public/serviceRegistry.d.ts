export interface ServiceStatus { state: string; port?: number; }
export interface ServiceSupervisorLike { getStatus(): ServiceStatus; }
export function getSupervisor(tool: string): ServiceSupervisorLike | null;
