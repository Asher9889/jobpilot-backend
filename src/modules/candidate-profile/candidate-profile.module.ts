import CandidateProfileService from "./candidate-profile.service.ts";
import CandidateProfileController from "./candidate-profile.controller.ts";

const candidateProfileService = new CandidateProfileService();
const candidateProfileController = new CandidateProfileController(candidateProfileService);

export { candidateProfileService, candidateProfileController };
