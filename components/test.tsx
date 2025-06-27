// if user selects a seat then let the table where that seat is located automatically be highlighted
// if (table === id) {
//     // Deselect if already selected
//     setTable('')
//     setTableSeatOptions([])
//     setSeat([])
// } else {
//     // Select this table
//     setTable(id)
//     setTableSeatOptions(seatOptions)
//     setSeat([])
// }

// 1. Find the table that owns this seat
        // const seatOptions = seat.filter((item) => item.startsWith('t'));
        // const owningTable = tableSeatOptionsxx.find(tableObj =>
        //     tableObj.options.some(option => seatOptions.includes(option))
        // ) as { id: string; options: string[] } | undefined;
        // if (!owningTable) return;                // safety guard

        // // 2. If that table is already selected, toggle everything off
        // // if (owningTable) {
        // //     setTable([]);                            // clear selected seats
        // //     return;
        // // }

        // // 3. Otherwise highlight the owning table and reset its context
        // setTable([...table, owningTable.id]);                // highlight this table
        // // setTableSeatOptions(seatOptions);
        // // setSeat([seatId]);        
        // console.log('owning table = '+owningTable)


        //  // 1. Find the table that owns this seat
        // const seatOptions = seat.filter((item) => item.startsWith('t'));
        // const owningTable = tableSeatOptionsxx.find(tableObj =>
        //     tableObj.options.some(option => seatOptions.includes(option))
        // ) as { id: string; options: string[] } | undefined;
        // if (!owningTable) return;                // safety guard

        // // 2. If that table is already selected, toggle everything off
        // if (owningTable) {
        //     setTable([]);                            // clear selected seats
        //     return;
        // }

        // // 3. Otherwise highlight the owning table and reset its context
        // setTable([...table, owningTable.id]);                // highlight this table
        // // setTableSeatOptions(seatOptions);
        // // setSeat([seatId]);        












        // console.log('owning table = '+owningTable)

        //  //1.Find every table whose seat list intersects the incoming seatOptions
        // const matchingTableIds = tableSeatOptions// [{id, options[]}, …]
        //     .filter(({ options }) =>// keep only tables
        //         options.some(opt => seatOptions.includes(opt))// that own ≥1 seat
        //     )
        //     .map(({ id }) => id);// → ['t1', 't3', …]

           
        // //2.Replace the selection: add all matches, drop everything else
        // //(If matchingTableIds = [], all tables are removed — exactly what we want.)
        // setTable([...table, ...matchingTableIds]);



        // compare table with matchingID's and delete item that doesnt match

        //compare the return values of matchingTableIds, seatOptions and table. use the difference to update table array
        const matchingTableIds = tableSeatOptions
            .filter(({ options }) =>
                options.some(opt => seatOptions.includes(opt))
            )
            .map(({ id }) => id);

        const filteredTable = table.filter(item => seatOptions.includes(item));
        setTable([filteredTable])
        
        console.log(`filtered table is = ${filteredTable}, matching table ids is = ${matchingTableIds}, selected seat options is = ${seatOptions}`)
        
        // console.log(` Table ${filteredTable} has been removed `)