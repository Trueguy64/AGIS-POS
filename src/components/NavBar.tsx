type GoldPrice = {
  goldPrice : number | null;
};

function NavBar({goldPrice} : GoldPrice){
    return(
        <nav className="fixed top-0 left-0 w-full">
            Price: {goldPrice !== null ? `$${goldPrice.toFixed(2)}` : "Loading..."}
        </nav>
    )
};

export default NavBar