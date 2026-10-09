import { Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import SearchBar from '../common/SearchBar';
import { useGoldRate } from '../../contexts/GoldRateContext';
import { RateStamp } from '../RateStamp';
import Wordmark from '../Wordmark';
import Bi from '../Bi';
import { both } from '../../lib/i18n';

type NavBarProps = {
    onHamburgerButtonClick: () => void;
    sidebarOpen: boolean;
}

function NavBar({ onHamburgerButtonClick, sidebarOpen }: NavBarProps) {
    const rate = useGoldRate();

    return (
        <nav className="flex h-16 shrink-0 items-center gap-3 bg-brass-700 px-3 text-slip md:gap-4 md:px-4">
            <button
                type="button"
                onClick={onHamburgerButtonClick}
                aria-label={both("toggleCategories")}
                aria-expanded={sidebarOpen}
                aria-controls="category-rail"
                className="flex h-11 w-11 items-center justify-center rounded-slip hover:bg-brass-800 active:bg-brass-800"
            >
                <Menu size={26} />
            </button>
            <a href="/" className="hidden sm:flex" aria-label="AGIS Gold POS">
                <Wordmark onBrass />
            </a>
            <div className="flex h-11 min-w-0 flex-1 items-center">
                <SearchBar />
            </div>
            <Link
                to="/sales"
                className="flex h-11 items-center gap-1 rounded-slip px-3 font-semibold hover:bg-brass-800"
                aria-label={both("sales")}
            >
                <Bi k="sales" />
            </Link>
            <Link
                to="/reservations"
                className="flex h-11 items-center gap-1 rounded-slip px-3 font-semibold hover:bg-brass-800"
                aria-label={both("reservations")}
            >
                <Bi k="reservations" />
            </Link>
            <RateStamp rate={rate} />
        </nav>
    );
}

export default NavBar;
