import { Menu, Plus } from 'lucide-react';
import SearchBar from '../common/SearchBar';
import { useGoldRate } from '../../contexts/GoldRateContext';
import { RateStamp } from '../RateStamp';
import Wordmark from '../Wordmark';

type editorNavBarProps = {
    onHamburgerButtonClick: () => void;
    onCreateButtonClick: () => void;
}

function EditorNavBar({ onHamburgerButtonClick, onCreateButtonClick }: editorNavBarProps) {
    const rate = useGoldRate();

    return (
        <nav className="flex h-16 shrink-0 items-center gap-3 bg-brass-700 px-3 text-slip md:gap-4 md:px-4">
            <button
                type="button"
                onClick={onHamburgerButtonClick}
                aria-label="Toggle categories and promotions"
                className="flex h-11 w-11 items-center justify-center rounded-slip hover:bg-brass-800 active:bg-brass-800"
            >
                <Menu size={26} />
            </button>
            <a href="/editor" className="hidden sm:flex" aria-label="AGIS store editor">
                <Wordmark onBrass word="Editor" />
            </a>
            <div className="flex h-11 min-w-0 flex-1 items-center">
                <SearchBar />
            </div>
            <button
                type="button"
                onClick={onCreateButtonClick}
                aria-label="New piece"
                className="flex h-11 shrink-0 items-center gap-2 rounded-slip bg-slip px-3 font-bold text-brass-800 hover:bg-brass-100 md:px-4"
            >
                <Plus size={20} />
                <span className="hidden md:inline">New piece</span>
            </button>
            <div className="hidden lg:block">
                <RateStamp rate={rate} />
            </div>
        </nav>
    );
}

export default EditorNavBar;
