"""Delete concept use case.

Handles concept deletion with cascade.
"""

from app.repositories.concept_repository import IConceptRepository
from app.repositories.link_repository import ILinkRepository


class DeleteConceptUseCase:
    """
    Use case for deleting concepts.
    
    Cascades link deletions.
    """
    
    def __init__(
        self,
        concept_repo: IConceptRepository,
        link_repo: ILinkRepository
    ):
        """
        Initialize use case.
        
        Args:
            concept_repo: Concept repository
            link_repo: Link repository for cascade deletions
        """
        self.concept_repo = concept_repo
        self.link_repo = link_repo
    
    def execute(self, project_id: str, concept_id: str) -> bool:
        """
        Delete a concept.
        
        Args:
            project_id: Project identifier
            concept_id: Concept identifier
            
        Returns:
            True if deleted, False if not found
        """
        # Check if concept exists
        if not self.concept_repo.find_by_id(project_id, concept_id):
            return False
        
        # CASCADE: Delete links referencing this concept
        source_links = self.link_repo.find_by_source(project_id, concept_id)
        target_links = self.link_repo.find_by_target(project_id, concept_id)
        
        for link in source_links + target_links:
            self.link_repo.delete(project_id, link.id)
        
        # Delete concept
        return self.concept_repo.delete(project_id, concept_id)


__all__ = ["DeleteConceptUseCase"]



