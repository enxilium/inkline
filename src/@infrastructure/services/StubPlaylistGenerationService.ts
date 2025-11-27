import { Character } from "../../@core/domain/entities/story/world/Character";
import { Location } from "../../@core/domain/entities/story/world/Location";
import { Organization } from "../../@core/domain/entities/story/world/Organization";
import { IPlaylistGenerationService } from "../../@core/domain/services/IPlaylistGenerationService";
import { Playlist } from "../../@core/domain/entities/story/world/Playlist";

const ERROR_MESSAGE = "Playlist generation is not available in this build.";

export class StubPlaylistGenerationService
    implements IPlaylistGenerationService
{
    async generatePlaylist(
        _subject: Character | Location | Organization
    ): Promise<Playlist> {
        throw new Error(ERROR_MESSAGE);
    }
}
