"""Delete link use case.

Handles relationship deletion.
"""

from app.repositories.link_repository import ILinkRepository


class DeleteLinkUseCase:
    """Use case for deleting relationships (links)."""
    
    def __init__(self, link_repo: ILinkRepository):
        """
        Initialize use case.
        
        Args:
            link_repo: Link repository
        """
        self.link_repo = link_repo
    
    def execute(self, project_id: str, link_id: str) -> bool:
        """
        Delete a relationship.
        
        Args:
            project_id: Project identifier
            link_id: Relationship identifier
            
        Returns:
            True if deleted, False if not found
        """
        return self.link_repo.delete(project_id, link_id)


__all__ = ["DeleteLinkUseCase"]



