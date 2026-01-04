import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";

export class SaveTimelineRequest {

}

export class SaveTimelineResponse {
    // Implementation will go here
}


export class SaveTimeline {
    // Instance variables
    private projectRepository: IProjectRepository;

    constructor(projectRepository: IProjectRepository) {
        this.projectRepository = projectRepository;
    }

    
}